param([string]$source,[string]$dest,[int]$width,[int]$quality)
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($source)
try {
  $targetWidth = [Math]::Min($width, $image.Width)
  if ($targetWidth -lt 1) { $targetWidth = 1 }
  $targetHeight = [int][Math]::Round($image.Height * $targetWidth / $image.Width)
  if ($targetHeight -lt 1) { $targetHeight = 1 }
  $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)
      $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
      $bitmap.Save($dest, $encoder, $encoderParams)
    } finally {
      $graphics.Dispose()
    }
  } finally {
    $bitmap.Dispose()
  }
} finally {
  $image.Dispose()
}