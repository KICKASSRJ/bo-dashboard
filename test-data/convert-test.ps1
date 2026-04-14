$src = "C:\Users\rasg\OneDrive - Microsoft\Desktop\AI Proj\EDIDC.XLSX"
$dst = "C:\Users\rasg\OneDrive - Microsoft\Desktop\AI Proj\EDIDC_converted.xlsx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($src)
    $wb.SaveAs($dst, 51)  # 51 = xlOpenXMLWorkbook
    $wb.Close($false)
    Write-Output "OK"
} catch {
    Write-Output "ERROR: $_"
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
