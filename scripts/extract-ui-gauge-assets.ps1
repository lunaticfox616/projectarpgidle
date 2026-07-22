Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$crops = @(
    @{ Source = 'health-player-v1.png'; Output = 'gauge-player-hp-v1.png'; X = 160; Y = 23; Width = 120; Height = 23 },
    @{ Source = 'health-player-v1.png'; Output = 'gauge-player-es-v1.png'; X = 423; Y = 22; Width = 35; Height = 24 },
    @{ Source = 'health-player-v1.png'; Output = 'gauge-player-exp-v1.png'; X = 76; Y = 61; Width = 83; Height = 4 },
    @{ Source = 'health-mob-v1.png'; Output = 'gauge-mob-hp-v1.png'; X = 21; Y = 22; Width = 111; Height = 6 },
    @{ Source = 'health-elite-v1.png'; Output = 'gauge-elite-hp-v1.png'; X = 45; Y = 27; Width = 145; Height = 10 },
    @{ Source = 'health-boss-v1.png'; Output = 'gauge-boss-hp-v1.png'; X = 49; Y = 29; Width = 204; Height = 8 }
)

foreach ($crop in $crops) {
    $sourcePath = Join-Path $root "assets/ui/$($crop.Source)"
    $outputPath = Join-Path $root "assets/ui/$($crop.Output)"
    $source = [System.Drawing.Bitmap]::new($sourcePath)
    try {
        $right = $crop.X + $crop.Width
        $bottom = $crop.Y + $crop.Height
        if ($crop.X -lt 0 -or $crop.Y -lt 0 -or $right -gt $source.Width -or $bottom -gt $source.Height) {
            throw "Crop $($crop.Output) falls outside $($crop.Source)."
        }
        $rect = [System.Drawing.Rectangle]::new($crop.X, $crop.Y, $crop.Width, $crop.Height)
        $result = $source.Clone($rect, $source.PixelFormat)
        try {
            $result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $result.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

Write-Output "Extracted $($crops.Count) gauge assets from the supplied UI artwork."
