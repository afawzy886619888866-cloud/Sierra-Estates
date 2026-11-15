# Sierra — اختبار /api/listings/submit بعد الإصلاح
# الرد لازم ييجي في أقل من ثانيتين ويرجّع success:true
$base = "https://sierra-estates.net"
$code = "SE-ZZTEST-$(Get-Random -Minimum 100 -Maximum 999)"

$body = @{
  code         = $code
  compound     = "Mivida"
  zone         = "5th Settlement"
  propertyType = "Apartment"
  mode         = "sale"
  beds         = 3
  baths        = 2
  area         = 150
  gardenArea   = 0
  price        = 8500000
  finishing    = "Fully Finished"
  role         = "broker"
  contactName  = "ZZ TEST — احذفه"
  phone        = "01000000000"
  notes        = "automated smoke test"
} | ConvertTo-Json

Write-Host "POST /api/listings/submit ($code) ..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $r = Invoke-RestMethod -Uri "$base/api/listings/submit" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 15
} catch {
  Write-Host "FAIL ✗ — الطلب فشل: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
$sw.Stop()
$ms = $sw.ElapsedMilliseconds
Write-Host "رد في ${ms}ms"
$r | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "تأكيد الحفظ في owner-intakes ..."
$list = Invoke-RestMethod -Uri "$base/api/listings/owner-intakes" -TimeoutSec 15
$found = $list.items | Where-Object { $_.code -eq $code }

if ($ms -lt 2000 -and $r.success -eq $true -and $found) {
  Write-Host "PASS ✓ — الحفظ شغال والرد سريع (السجل ظهر في القايمة)" -ForegroundColor Green
  Write-Host "افحص كمان تاب Easy_Listings في الشيت (لو SHEET_WEBAPP_URL متظبط)."
  Write-Host "وبعد كده امسح سجل الاختبار $code"
} else {
  Write-Host "FAIL ✗ — time=${ms}ms success=$($r.success) saved=$([bool]$found)" -ForegroundColor Red
  exit 1
}
