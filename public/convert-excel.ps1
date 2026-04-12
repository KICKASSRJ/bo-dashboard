<# 
  BO Dashboard — Excel DRM Converter
  Converts DRM-protected .xlsx files from SAP to standard .xlsx format.
  
  Usage: 
    1. Double-click this script, OR
    2. Right-click → "Run with PowerShell"
    3. Select the files to convert when the file dialog opens
    4. Converted files will be saved with "_converted" suffix
#>

Add-Type -AssemblyName System.Windows.Forms

# File picker dialog
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Select SAP Excel files to convert"
$dialog.Filter = "Excel Files (*.xlsx;*.xls)|*.xlsx;*.xls|All Files (*.*)|*.*"
$dialog.Multiselect = $true
$dialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")

if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Host "No files selected. Exiting."
    Read-Host "Press Enter to close"
    exit
}

$files = $dialog.FileNames
Write-Host "`n=== BO Dashboard Excel Converter ===" -ForegroundColor Cyan
Write-Host "Converting $($files.Count) file(s)...`n"

$excel = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $success = 0
    $failed = 0

    foreach ($file in $files) {
        $name = [System.IO.Path]::GetFileNameWithoutExtension($file)
        $dir = [System.IO.Path]::GetDirectoryName($file)
        $outFile = Join-Path $dir "${name}_converted.xlsx"

        Write-Host "  Processing: $([System.IO.Path]::GetFileName($file))..." -NoNewline

        try {
            $wb = $excel.Workbooks.Open($file)
            $wb.SaveAs($outFile, 51)  # 51 = xlOpenXMLWorkbook (.xlsx)
            $wb.Close($false)
            Write-Host " OK -> $([System.IO.Path]::GetFileName($outFile))" -ForegroundColor Green
            $success++
        }
        catch {
            Write-Host " FAILED: $_" -ForegroundColor Red
            $failed++
        }
    }

    Write-Host "`n=== Done: $success converted, $failed failed ===" -ForegroundColor Cyan
}
catch {
    Write-Host "Error starting Excel: $_" -ForegroundColor Red
    Write-Host "Make sure Microsoft Excel is installed." -ForegroundColor Yellow
}
finally {
    if ($excel) {
        $excel.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
        [System.GC]::Collect()
    }
}

Write-Host ""
Read-Host "Press Enter to close"
