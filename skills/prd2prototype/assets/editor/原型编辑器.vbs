' 原型编辑器(Windows)—— 双击不弹黑窗。需装 Node.js。
' 与 原型编辑器.app 文件夹放同一目录(Windows 上 .app 只是普通文件夹)。
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
rc = sh.Run("cmd /c where node", 0, True)
If rc <> 0 Then
  MsgBox "未检测到 Node.js。请先安装:https://nodejs.org" & vbCrLf & "装好后再双击本文件。", 48, "原型编辑器"
  WScript.Quit
End If
launcher = dir & "\原型编辑器.app\Contents\Resources\launcher.js"
sh.CurrentDirectory = dir
' 0 = 隐藏窗口,False = 不等待
sh.Run "cmd /c node """ & launcher & """", 0, False
