Add-Type -AssemblyName System.Drawing
function Dump($path,$minArea){
  $bmp=[System.Drawing.Bitmap]::FromFile($path)
  $w=$bmp.Width; $h=$bmp.Height
  $visited=New-Object 'bool[,]' $w,$h
  $dirs=@(@(1,0),@(-1,0),@(0,1),@(0,-1))
  $results=@()
  function IsBg([System.Drawing.Color]$c){
    $max=[Math]::Max($c.R,[Math]::Max($c.G,$c.B))
    $min=[Math]::Min($c.R,[Math]::Min($c.G,$c.B))
    $avg=($c.R+$c.G+$c.B)/3
    if($c.A -lt 20){ return $true }
    if($avg -ge 228 -and ($max-$min) -le 22){ return $true }
    return $false
  }
  for($y=0;$y -lt $h;$y++){
    for($x=0;$x -lt $w;$x++){
      if($visited[$x,$y]){continue}
      $visited[$x,$y]=$true
      $c=$bmp.GetPixel($x,$y)
      if(IsBg $c){continue}
      $q=New-Object System.Collections.Generic.Queue[object]
      $q.Enqueue(@($x,$y))
      $minX=$x; $maxX=$x; $minY=$y; $maxY=$y; $count=0
      while($q.Count -gt 0){
        $p=$q.Dequeue(); $px=[int]$p[0]; $py=[int]$p[1]
        $count++
        if($px -lt $minX){$minX=$px}; if($px -gt $maxX){$maxX=$px}; if($py -lt $minY){$minY=$py}; if($py -gt $maxY){$maxY=$py}
        foreach($d in $dirs){
          $nx=$px+$d[0]; $ny=$py+$d[1]
          if($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h){continue}
          if($visited[$nx,$ny]){continue}
          $visited[$nx,$ny]=$true
          $nc=$bmp.GetPixel($nx,$ny)
          if(IsBg $nc){continue}
          $q.Enqueue(@($nx,$ny))
        }
      }
      if($count -ge $minArea){ $results += [pscustomobject]@{x=$minX;y=$minY;width=($maxX-$minX+1);height=($maxY-$minY+1);area=$count} }
    }
  }
  $bmp.Dispose()
  return ($results | Sort-Object y,x | ConvertTo-Json -Compress)
}
Write-Output 'HERO'
Write-Output (Dump 'C:\Users\Administrator\Documents\Codex\2026-04-19-doctype-html-html-lang-ko-head\assets\battle-hero-v1.png' 150)
Write-Output 'ENEMIES'
Write-Output (Dump 'C:\Users\Administrator\Documents\Codex\2026-04-19-doctype-html-html-lang-ko-head\assets\battle-enemies-v1.png' 150)
Write-Output 'EFFECTS'
Write-Output (Dump 'C:\Users\Administrator\Documents\Codex\2026-04-19-doctype-html-html-lang-ko-head\assets\battle-effects-v1.png' 80)
Write-Output 'TILES'
Write-Output (Dump 'C:\Users\Administrator\Documents\Codex\2026-04-19-doctype-html-html-lang-ko-head\assets\battle-tiles-v1.png' 200)
