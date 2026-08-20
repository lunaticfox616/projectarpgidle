param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [ValidatePattern('^v[0-9]+$')]
    [string]$Version = 'v1'
)

Add-Type -AssemblyName System.Drawing

$iconNames = @(
    'root-sword', 'thorn-bow', 'branch-staff', 'tower-shield',
    'antler-helmet', 'root-armor', 'claw-gauntlets', 'travel-boots',
    'engraved-belt', 'ruby-ring', 'violet-amulet', 'chaos-jewel',
    'seed-talisman', 'flower-growth', 'thorn-growth', 'cosmic-slab'
) | ForEach-Object { "$_-$Version" }

function Test-AtlasBackgroundPixel {
    param([byte[]]$Pixels, [int]$Offset)
    $blue = $Pixels[$Offset]
    $green = $Pixels[$Offset + 1]
    $red = $Pixels[$Offset + 2]
    $maximum = [Math]::Max($red, [Math]::Max($green, $blue))
    $minimum = [Math]::Min($red, [Math]::Min($green, $blue))
    return $minimum -ge 198 -and ($maximum - $minimum) -le 24
}

function Remove-ConnectedBackground {
    param([System.Drawing.Bitmap]$Bitmap)
    $width = $Bitmap.Width
    $height = $Bitmap.Height
    $rectangle = [Drawing.Rectangle]::new(0, 0, $width, $height)
    $bitmapData = $Bitmap.LockBits($rectangle, [Drawing.Imaging.ImageLockMode]::ReadWrite, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bitmapData.Stride
    $pixels = [byte[]]::new($stride * $height)
    [Runtime.InteropServices.Marshal]::Copy($bitmapData.Scan0, $pixels, 0, $pixels.Length)
    $visited = [Collections.BitArray]::new($width * $height)
    $queue = [Collections.Generic.Queue[int]]::new()
    for ($x = 0; $x -lt $width; $x++) {
        $queue.Enqueue($x)
        $queue.Enqueue((($height - 1) * $width) + $x)
    }
    for ($y = 1; $y -lt ($height - 1); $y++) {
        $queue.Enqueue($y * $width)
        $queue.Enqueue(($y * $width) + $width - 1)
    }
    while ($queue.Count -gt 0) {
        $index = $queue.Dequeue()
        if ($visited[$index]) { continue }
        $visited[$index] = $true
        $x = $index % $width
        $y = [Math]::Floor($index / $width)
        $offset = ($y * $stride) + ($x * 4)
        if (-not (Test-AtlasBackgroundPixel $pixels $offset)) { continue }
        $pixels[$offset + 3] = 0
        if ($x -gt 0) { $queue.Enqueue($index - 1) }
        if ($x + 1 -lt $width) { $queue.Enqueue($index + 1) }
        if ($y -gt 0) { $queue.Enqueue($index - $width) }
        if ($y + 1 -lt $height) { $queue.Enqueue($index + $width) }
    }
    [Runtime.InteropServices.Marshal]::Copy($pixels, 0, $bitmapData.Scan0, $pixels.Length)
    $Bitmap.UnlockBits($bitmapData)
}

function Get-OpaqueBounds {
    param([System.Drawing.Bitmap]$Bitmap, [System.Drawing.Rectangle]$Cell)
    $left = $Cell.Right
    $top = $Cell.Bottom
    $right = $Cell.Left
    $bottom = $Cell.Top
    # LockBits on a sub-rectangle can retain the parent bitmap stride. Copying
    # Cell.Height * stride bytes from that offset overruns the final atlas cells.
    # Clone the cell first so its buffer and stride are local and contiguous.
    $cellBitmap = $Bitmap.Clone($Cell, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $localRect = [Drawing.Rectangle]::new(0, 0, $Cell.Width, $Cell.Height)
    $bitmapData = $cellBitmap.LockBits($localRect, [Drawing.Imaging.ImageLockMode]::ReadOnly, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bitmapData.Stride
    $pixels = [byte[]]::new($stride * $Cell.Height)
    [Runtime.InteropServices.Marshal]::Copy($bitmapData.Scan0, $pixels, 0, $pixels.Length)
    for ($localY = 0; $localY -lt $Cell.Height; $localY++) {
        for ($localX = 0; $localX -lt $Cell.Width; $localX++) {
            if ($pixels[($localY * $stride) + ($localX * 4) + 3] -eq 0) { continue }
            $x = $Cell.Left + $localX
            $y = $Cell.Top + $localY
            $left = [Math]::Min($left, $x)
            $top = [Math]::Min($top, $y)
            $right = [Math]::Max($right, $x)
            $bottom = [Math]::Max($bottom, $y)
        }
    }
    $cellBitmap.UnlockBits($bitmapData)
    $cellBitmap.Dispose()
    if ($right -lt $left) { return $Cell }
    return [Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
}

function Export-AtlasCell {
    param([System.Drawing.Bitmap]$Atlas, [System.Drawing.Rectangle]$Cell, [string]$Destination)
    $bounds = Get-OpaqueBounds $Atlas $Cell
    $canvas = [Drawing.Bitmap]::new(256, 256, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
    $scale = [Math]::Min(224 / $bounds.Width, 224 / $bounds.Height)
    $drawWidth = [Math]::Max(1, [Math]::Round($bounds.Width * $scale))
    $drawHeight = [Math]::Max(1, [Math]::Round($bounds.Height * $scale))
    $destinationRect = [Drawing.Rectangle]::new([Math]::Round((256 - $drawWidth) / 2), [Math]::Round((256 - $drawHeight) / 2), $drawWidth, $drawHeight)
    $graphics.DrawImage($Atlas, $destinationRect, $bounds, [Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    $canvas.Save($Destination, [Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$source = [Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath))
$atlas = [Drawing.Bitmap]::new($source.Width, $source.Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$atlasGraphics = [Drawing.Graphics]::FromImage($atlas)
$atlasGraphics.DrawImageUnscaled($source, 0, 0)
$atlasGraphics.Dispose()
$source.Dispose()
Remove-ConnectedBackground $atlas

$xEdges = @(0, [Math]::Round($atlas.Width / 4), [Math]::Round($atlas.Width / 2), [Math]::Round($atlas.Width * 3 / 4), $atlas.Width)
$yEdges = @(0, [Math]::Round($atlas.Height / 4), [Math]::Round($atlas.Height / 2), [Math]::Round($atlas.Height * 3 / 4), $atlas.Height)
for ($row = 0; $row -lt 4; $row++) {
    for ($column = 0; $column -lt 4; $column++) {
        $index = ($row * 4) + $column
        $cell = [Drawing.Rectangle]::FromLTRB($xEdges[$column], $yEdges[$row], $xEdges[$column + 1], $yEdges[$row + 1])
        $destination = Join-Path $OutputDirectory ($iconNames[$index] + '.png')
        Export-AtlasCell $atlas $cell $destination
    }
}
$atlas.Dispose()
