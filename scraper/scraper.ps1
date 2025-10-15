[CmdletBinding()]
param (
    [int]$MaxThreads = 25, 
    [string]$Semester = "20251"
)

$OutputEncoding = [System.Text.UTF8Encoding]::new()

$outputFile = "bilkent_final_data.json"
$userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

if (-not (Get-Module -ListAvailable -Name ThreadJob)) {
    Write-Error "Gerekli 'ThreadJob' modülü bulunamadı. Lütfen yönetici olarak bir PowerShell penceresi açıp 'Install-Module -Name ThreadJob' komutunu çalıştırın."
    exit 1
}

[System.Reflection.Assembly]::LoadWithPartialName('System.Web') | Out-Null

function Get-DecodedWebContent {
    param($Uri)
    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -UserAgent $userAgent
        $stream = New-Object System.IO.StreamReader($response.RawContentStream, [System.Text.Encoding]::GetEncoding("ISO-8859-9"))
        $content = $stream.ReadToEnd(); $stream.Close(); return $content
    } catch { Write-Warning "URL alinamadi: $Uri. Hata: $($_.Exception.Message)"; return $null }
}

$departmentsUrl = "https://stars.bilkent.edu.tr/homepage/ajax/plainCourseCodes.php"
$coursesBaseUrl = "https://stars.bilkent.edu.tr/homepage/ajax/offerings.list.php"
$sectionsBaseUrl = "https://stars.bilkent.edu.tr/homepage/ajax/course.sections.php"
$scheduleBaseUrl = "https://stars.bilkent.edu.tr/homepage/ajax/schedule.php"

Write-Host "ADIM 1: Tüm departman, ders ve seksiyon yapıları keşfediliyor..." -ForegroundColor Yellow

try {
    $deptContent = Get-DecodedWebContent -Uri $departmentsUrl
    $deptRowRegex = "(?s)<tr id='([^']*)'[^>]*>(.*?)</tr>"
    $deptCellRegex = "<td[^>]*>(.*?)</td>"
    $deptRowMatches = [regex]::Matches($deptContent, $deptRowRegex)

    if ($deptRowMatches.Count -eq 0) { throw "Hiç departman bulunamadı." }

    $finalOutput = [System.Collections.Generic.List[PSCustomObject]]::new()
    $allSectionsToProcess = [System.Collections.Generic.List[PSCustomObject]]::new()

    foreach ($deptMatch in $deptRowMatches) {
        $deptRowHtml = $deptMatch.Groups[2].Value
        $deptCellMatches = [regex]::Matches($deptRowHtml, $deptCellRegex)
        if ($deptCellMatches.Count -lt 2) { continue }
        $deptCode = $deptCellMatches[0].Groups[1].Value.Trim()
        $deptName = $deptCellMatches[1].Groups[1].Value.Trim()

        Write-Host "`nDepartman isleniyor: $deptCode - $deptName"

        $departmentObject = [PSCustomObject]@{ deptCode = $deptCode; deptName = $deptName; courses  = [System.Collections.Generic.List[PSCustomObject]]::new() }
        
        $coursesUrl = "$($coursesBaseUrl)?CRSCODES=$($deptCode)&SEMESTER=$($Semester)"
        $courseContent = Get-DecodedWebContent -Uri $coursesUrl
        
        $courseRowRegex = "(?s)<tr id='([^']*)'[^>]*>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>"
        $courseRowMatches = [regex]::Matches($courseContent, $courseRowRegex)

        foreach ($courseMatch in $courseRowMatches) {
            $groups = $courseMatch.Groups
            $courseId = $groups[1].Value.Trim()
            $courseCode = $groups[2].Value.Trim()
            $courseName = $groups[3].Value.Trim()
            if ([string]::IsNullOrWhiteSpace($courseCode)) { continue }

            $lectureHours = ([int]($groups[4].Value | Where-Object {$_ -match '\d+'})) + `
                            ([int]($groups[5].Value | Where-Object {$_ -match '\d+'})) + `
                            ([int]($groups[6].Value | Where-Object {$_ -match '\d+'}))
            $labHours =     ([int]($groups[7].Value | Where-Object {$_ -match '\d+'})) + `
                            ([int]($groups[8].Value | Where-Object {$_ -match '\d+'}))

            $courseObject = [PSCustomObject]@{ code = $courseCode; name = $courseName; lectureHours = $lectureHours; labHours = $labHours; sections = [System.Collections.Generic.List[PSCustomObject]]::new() }

            $encodedCourseIdForSections = [System.Web.HttpUtility]::UrlEncode($courseId)
            $sectionsUrl = "$($sectionsBaseUrl)?COURSE=$encodedCourseIdForSections&SEMESTER=$($Semester)"
            $sectionsContent = Get-DecodedWebContent -Uri $sectionsUrl
            
            $sectionRowRegex = "(?s)<tr id='.*?'>\s*<td>(.*?)</td>\s*<td>(.*?)</td>"
            $instructorRegex = "width:150px.*?>(.*?)</div>"
            $sectionMatches = [regex]::Matches($sectionsContent, $sectionRowRegex)
            
            foreach ($sectionMatch in $sectionMatches) {
                $fullSectionCode = $sectionMatch.Groups[1].Value.Trim()
                $instructorCellHtml = $sectionMatch.Groups[2].Value
                $sectionNum = ($fullSectionCode -split '-')[-1].Trim()
                $instructorMatch = [regex]::Match($instructorCellHtml, $instructorRegex)
                $instructor = if($instructorMatch.Success){ $instructorMatch.Groups[1].Value.Trim() } else { "N/A" }

                if ($sectionNum -match '^\d+$') {
                    $sectionObject = [PSCustomObject]@{ num = $sectionNum; instructor = $instructor; lectures = @(); labs = @() }
                    $courseObject.sections.Add($sectionObject)
                    $allSectionsToProcess.Add([PSCustomObject]@{ FullCourseCode = $fullSectionCode; DeptCode = $deptCode; CourseCode = $courseCode; SectionNum = $sectionNum })
                }
            }
            if($courseObject.sections.Count -gt 0) { $departmentObject.courses.Add($courseObject) }
        }
        if($departmentObject.courses.Count -gt 0) { $finalOutput.Add($departmentObject) }
    }

    Write-Host "`nKeşif tamamlandı. $($finalOutput.Count) departman ve $($allSectionsToProcess.Count) toplam seksiyon bulundu."

    Write-Host "`nADIM 2: Ders programları paralel olarak çekiliyor (Maksimum Thread: $MaxThreads)..." -ForegroundColor Yellow
    
    $scriptBlock = {
        param($sectionInfo, $scheduleBaseUrl, $Semester, $userAgent)
        [System.Reflection.Assembly]::LoadWithPartialName('System.Web') | Out-Null
        function Get-DecodedWebContent-Thread {
            param($Uri)
            try {
                $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -UserAgent $userAgent -TimeoutSec 20
                $stream = New-Object System.IO.StreamReader($response.RawContentStream, [System.Text.Encoding]::GetEncoding("ISO-8859-9"))
                $content = $stream.ReadToEnd(); $stream.Close(); return $content
            } catch { return $null }
        }

        $encodedFullCourseCode = [System.Web.HttpUtility]::UrlEncode($sectionInfo.FullCourseCode)
        $scheduleUrl = "$($scheduleBaseUrl)?COURSE=$encodedFullCourseCode&SEMESTER=$($Semester)"
        $lectures = [System.Collections.Generic.List[int]]::new(); $labs = [System.Collections.Generic.List[int]]::new()
        
        $scheduleContent = Get-DecodedWebContent-Thread -Uri $scheduleUrl
        if ($scheduleContent) {
            $scheduleRowRegex = '(?s)<tr><td align=.right.*?<b>.*?</b></td>(.*?)</tr>'
            $scheduleRows = [regex]::Matches($scheduleContent, $scheduleRowRegex)
            if ($scheduleRows.Count -gt 0) {
                $numTimeSlots = $scheduleRows.Count
                for ($rowIndex = 0; $rowIndex -lt $numTimeSlots; $rowIndex++) {
                    $rowHtml = $scheduleRows[$rowIndex].Groups[1].Value
                    $cellRegex = '(?s)<td(.*?)</td>'
                    $cells = [regex]::Matches($rowHtml, $cellRegex)
                    for ($colIndex = 0; $colIndex -lt $cells.Count; $colIndex++) {
                        $cellHtml = $cells[$colIndex].Value
                        if ($cellHtml -notlike '*&nbsp;*' -and $cellHtml -like '*class=*') {
                            $blockIndex = ($colIndex * $numTimeSlots) + $rowIndex
                            if ($cellHtml -like '*cl_lab_*') { $labs.Add($blockIndex) } else { $lectures.Add($blockIndex) }
                        }
                    }
                }
            }
        }
        return [PSCustomObject]@{ DeptCode = $sectionInfo.DeptCode; CourseCode = $sectionInfo.CourseCode; SectionNum = $sectionInfo.SectionNum; Lectures = $lectures; Labs = $labs }
    }

    $jobs = @()
    foreach ($section in $allSectionsToProcess) {
        while ($(Get-Job -State Running).Count -ge $MaxThreads) { Start-Sleep -Milliseconds 100 }
        $jobs += Start-ThreadJob -ScriptBlock $scriptBlock -ArgumentList @($section, $scheduleBaseUrl, $Semester, $userAgent)
    }

    Write-Host "Tüm işler başlatıldı. Tamamlanmaları bekleniyor..."
    $results = $jobs | Wait-Job | Receive-Job
    
    Write-Host "`nADIM 3: Sonuçlar ana veri yapısına birleştiriliyor..." -ForegroundColor Yellow
    
    $lookup = @{}
    foreach($dept in $finalOutput){ foreach($course in $dept.courses){ foreach($section in $course.sections){ $lookup["$($dept.deptCode)_$($course.code)_$($section.num)"] = $section }}}
    
    foreach($result in $results){
        if ($result) {
            $key = "$($result.DeptCode)_$($result.CourseCode)_$($result.SectionNum)"
            if($lookup.ContainsKey($key)){ $lookup[$key].lectures = $result.Lectures; $lookup[$key].labs = $result.Labs }
        }
    }
    Get-Job | Remove-Job

    $finalOutput | ConvertTo-Json -Depth 15 -Compress | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host "`nİşlem başarıyla tamamlandı! Tüm veriler '$($outputFile)' dosyasına kaydedildi." -ForegroundColor Green

} catch {
    Write-Host "`n[HATA] İşlem sırasında bir sorun oluştu:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Get-Job | Remove-Job
}