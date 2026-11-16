$ErrorActionPreference = 'Stop'

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$secureToken = Read-Host 'Paste Telegram bot token (input is hidden)' -AsSecureString
$tokenPointer = [IntPtr]::Zero

Push-Location $repositoryRoot
try {
    if ($secureToken.Length -eq 0) {
        throw 'A Telegram bot token is required.'
    }

    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $env:TELEGRAM_BOT_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    if ($env:TELEGRAM_BOT_TOKEN -notmatch '^\d+:[A-Za-z0-9_-]+$') {
        throw 'The supplied value does not look like a Telegram bot token.'
    }

    pnpm telegram:intake
    if ($LASTEXITCODE -ne 0) {
        throw "Telegram intake exited with code $LASTEXITCODE."
    }
}
finally {
    Remove-Item Env:TELEGRAM_BOT_TOKEN -ErrorAction SilentlyContinue
    if ($tokenPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    }
    if ($secureToken) {
        $secureToken.Dispose()
    }
    Pop-Location
}
