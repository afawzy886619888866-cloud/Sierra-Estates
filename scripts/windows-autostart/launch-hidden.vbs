Option Explicit
Dim fso, scriptDir, psScript, shell, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = fso.BuildPath(scriptDir, "start-sierra-automation.ps1")

If Not fso.FileExists(psScript) Then
  psScript = "H:\Sierra Estates\scripts\windows-autostart\start-sierra-automation.ps1"
End If

Set shell = CreateObject("WScript.Shell")
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """"
shell.Run cmd, 0, False
