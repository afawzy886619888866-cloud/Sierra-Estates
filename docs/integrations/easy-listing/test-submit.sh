#!/usr/bin/env bash
# Sierra — اختبار /api/listings/submit بعد الإصلاح
# الرد لازم ييجي في أقل من ثانيتين ويرجّع success:true
BASE="https://sierra-estates.net"
CODE="SE-ZZTEST-$((RANDOM % 900 + 100))"

echo "POST /api/listings/submit ($CODE) ..."
T0=$(date +%s%3N)
HTTP=$(curl -s --max-time 15 -w '\n%{http_code}' -X POST "$BASE/api/listings/submit" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"compound\":\"Mivida\",\"zone\":\"5th Settlement\",\"propertyType\":\"Apartment\",\"mode\":\"sale\",\"beds\":3,\"baths\":2,\"area\":150,\"gardenArea\":0,\"price\":8500000,\"finishing\":\"Fully Finished\",\"role\":\"broker\",\"contactName\":\"ZZ TEST\",\"phone\":\"01000000000\",\"notes\":\"automated smoke test\"}")
T1=$(date +%s%3N)
MS=$((T1 - T0))
BODY=$(echo "$HTTP" | head -n -1)
CODE_HTTP=$(echo "$HTTP" | tail -n 1)
echo "رد في ${MS}ms — HTTP $CODE_HTTP"
echo "$BODY"

echo ""
echo "تأكيد الحفظ في owner-intakes ..."
FOUND=$(curl -s --max-time 15 "$BASE/api/listings/owner-intakes" | grep -c "$CODE" || true)

if [ "$MS" -lt 2000 ] && [ "$CODE_HTTP" = "201" ] && [ "$FOUND" -ge 1 ]; then
  echo "PASS ✓ — الحفظ شغال والرد سريع (السجل ظهر في القايمة)"
  echo "افحص كمان تاب Easy_Listings في الشيت (لو SHEET_WEBAPP_URL متظبط)."
  echo "وبعد كده امسح سجل الاختبار $CODE"
else
  echo "FAIL ✗ — time=${MS}ms http=$CODE_HTTP found=$FOUND"
  exit 1
fi
