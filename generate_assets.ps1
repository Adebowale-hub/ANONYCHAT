Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\user\.gemini\antigravity-ide\brain\6b49fb93-7318-4572-ba29-980edb928e1b\.user_uploaded\media_1789558065020.jpg"
$resRoot = "c:\Users\user\Desktop\chat\whatsapp-client\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$OutPath
    )
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($Image, 0, 0, $Width, $Height)
    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Create-Round-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Size,
        [string]$OutPath
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $Size, $Size)
    $g.SetClip($path)
    $g.DrawImage($Image, 0, 0, $Size, $Size)
    $g.ResetClip()
    $path.Dispose()
    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Create-Foreground-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Size,
        [string]$OutPath
    )
    # Foreground icon for adaptive icons (in center 66% of canvas)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $innerSize = [int]($Size * 0.72)
    $offset = [int](($Size - $innerSize) / 2)
    $g.DrawImage($Image, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Create-Splash-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$OutPath
    )
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Dark modern background (#121212)
    $bgColor = [System.Drawing.Color]::FromArgb(18, 18, 18)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $Width, $Height)
    $brush.Dispose()

    # Center the logo (about 40% of min dimension)
    $minDim = [Math]::Min($Width, $Height)
    $logoSize = [int]($minDim * 0.45)
    $logoX = [int](($Width - $logoSize) / 2)
    $logoY = [int](($Height - $logoSize) / 2)

    $g.DrawImage($Image, $logoX, $logoY, $logoSize, $logoSize)
    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Icon dimensions per mipmap density
$mipmapSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $mipmapSizes.Keys) {
    $dir = Join-Path $resRoot $folder
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $size = $mipmapSizes[$folder]
    
    Resize-Image -Image $srcImg -Width $size -Height $size -OutPath (Join-Path $dir "ic_launcher.png")
    Create-Round-Image -Image $srcImg -Size $size -OutPath (Join-Path $dir "ic_launcher_round.png")
    Create-Foreground-Image -Image $srcImg -Size ([int]($size * 1.5)) -OutPath (Join-Path $dir "ic_launcher_foreground.png")
    Write-Host "Generated launcher icons for $folder ($size x $size)"
}

# Splash dimensions
$splashSizes = @{
    "drawable" = @{ Width = 480; Height = 800 }
    "drawable-port-mdpi" = @{ Width = 320; Height = 480 }
    "drawable-port-hdpi" = @{ Width = 480; Height = 800 }
    "drawable-port-xhdpi" = @{ Width = 720; Height = 1280 }
    "drawable-port-xxhdpi" = @{ Width = 960; Height = 1600 }
    "drawable-port-xxxhdpi" = @{ Width = 1280; Height = 1920 }
    "drawable-land-mdpi" = @{ Width = 480; Height = 320 }
    "drawable-land-hdpi" = @{ Width = 800; Height = 480 }
    "drawable-land-xhdpi" = @{ Width = 1280; Height = 720 }
    "drawable-land-xxhdpi" = @{ Width = 1600; Height = 960 }
    "drawable-land-xxxhdpi" = @{ Width = 1920; Height = 1280 }
}

foreach ($folder in $splashSizes.Keys) {
    $dir = Join-Path $resRoot $folder
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $dim = $splashSizes[$folder]
    Create-Splash-Image -Image $srcImg -Width $dim.Width -Height $dim.Height -OutPath (Join-Path $dir "splash.png")
    Write-Host "Generated splash for $folder ($($dim.Width) x $($dim.Height))"
}

# Copy as public/logo.jpg
Copy-Item -Path $srcPath -Destination "c:\Users\user\Desktop\chat\whatsapp-client\public\logo.jpg" -Force
if (Test-Path "c:\Users\user\Desktop\chat\whatsapp-client\dist") {
    Copy-Item -Path $srcPath -Destination "c:\Users\user\Desktop\chat\whatsapp-client\dist\logo.jpg" -Force
}

$srcImg.Dispose()
Write-Host "Asset generation complete!"
