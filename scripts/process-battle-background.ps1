param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [ValidateRange(256, 2048)]
    [int]$Size = 627,
    [ValidateRange(1, 100)]
    [int]$Quality = 72
)

Add-Type -AssemblyName System.Drawing

$source = [Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath))
$output = [Drawing.Bitmap]::new($Size, $Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($output)
$graphics.Clear([Drawing.Color]::Black)
$graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
$graphics.DrawImage(
    $source,
    [Drawing.Rectangle]::new(0, 0, $Size, $Size),
    [Drawing.Rectangle]::new(0, 0, $source.Width, $source.Height),
    [Drawing.GraphicsUnit]::Pixel
)
$graphics.Dispose()
$source.Dispose()

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) { New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null }
$outputExtension = [IO.Path]::GetExtension($OutputPath).ToLowerInvariant()
if ($outputExtension -eq '.webp') {
    $encoder = Get-Command cwebp -ErrorAction SilentlyContinue
    if (-not $encoder) {
        $output.Dispose()
        throw 'WebP 출력에는 cwebp가 필요합니다. cwebp를 설치하거나 .png 출력 경로를 사용하세요.'
    }
    $temporaryPng = Join-Path ([IO.Path]::GetTempPath()) ("rignin-backdrop-{0}.png" -f [Guid]::NewGuid())
    try {
        $output.Save($temporaryPng, [Drawing.Imaging.ImageFormat]::Png)
        & $encoder.Source '-quiet' '-q' $Quality $temporaryPng '-o' $OutputPath
        if ($LASTEXITCODE -ne 0) {
            $exitCode = $LASTEXITCODE
            $output.Dispose()
            throw "cwebp 변환 실패 (exit $exitCode)"
        }
    }
    finally {
        if (Test-Path -LiteralPath $temporaryPng) { Remove-Item -LiteralPath $temporaryPng -Force }
    }
}
else {
    $output.Save($OutputPath, [Drawing.Imaging.ImageFormat]::Png)
}
$output.Dispose()
