# BO Self Serve Dashboard — Portable Launcher
# Starts a lightweight local HTTP server and opens the dashboard in your default browser.
# No installation required — just run start.bat

$port = 8080
$root = Join-Path $PSScriptRoot "dist"

# Find a free port if 8080 is busy
while ($true) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close()
        $port++
    } catch {
        break
    }
}

$prefix = "http://localhost:$port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "ERROR: Could not start server on port $port." -ForegroundColor Red
    Write-Host "Try running as Administrator or close other apps using that port."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "  BO Self Serve Dashboard" -ForegroundColor Cyan
Write-Host "  ========================" -ForegroundColor DarkCyan
Write-Host "  Running at: $prefix" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

# Open browser
Start-Process $prefix

# MIME type map
$mimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".wasm" = "application/wasm"
}

# Serve loop
try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $path = $req.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }

        $filePath = Join-Path $root ($path -replace '/', '\')

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $res.ContentType = $mime
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # SPA fallback — serve index.html for client-side routing
            $indexPath = Join-Path $root "index.html"
            $res.ContentType = "text/html"
            $bytes = [System.IO.File]::ReadAllBytes($indexPath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }

        $res.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
