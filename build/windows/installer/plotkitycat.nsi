Unicode true
ManifestDPIAware true
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

!ifndef APP_VERSION
  !error "APP_VERSION is required"
!endif
!ifndef PAYLOAD_DIR
  !error "PAYLOAD_DIR is required"
!endif
!ifndef SETUP_FILE
  !error "SETUP_FILE is required"
!endif
!ifndef WEBVIEW_BOOTSTRAPPER
  !error "WEBVIEW_BOOTSTRAPPER is required"
!endif

!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\PlotKityCat"
!define WEBVIEW_KEY "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "PlotKityCat"
OutFile "${SETUP_FILE}"
InstallDir "$LOCALAPPDATA\Programs\PlotKityCat"
BrandingText "PlotKityCat"
Icon "..\icon.ico"
UninstallIcon "..\icon.ico"
ShowInstDetails show
ShowUninstDetails show

Var ImportCheck
Var ImportEdit
Var ImportBrowse
Var LegacySource

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\PlotKityCat.exe"
!define MUI_FINISHPAGE_RUN_TEXT "打开 PlotKityCat"
Page custom InstallOptions InstallOptionsLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

Function .onInit
  SetShellVarContext current
  SetRegView 64
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_OK|MB_ICONSTOP "PlotKityCat 支持 Windows 10/11。"
    SetErrorLevel 64
    Quit
  ${EndIf}
  ${IfNot} ${IsNativeAMD64}
    MessageBox MB_OK|MB_ICONSTOP "此安装包适用于 x64 电脑。"
    SetErrorLevel 65
    Quit
  ${EndIf}
  StrCpy $LegacySource ""
FunctionEnd

Function InstallOptions
  !insertmacro MUI_HEADER_TEXT "安装 PlotKityCat" "点击安装，完成后即可从桌面打开。"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 34u "安装位置：$LOCALAPPDATA\Programs\PlotKityCat$\r$\n安装、升级和卸载会保留用户作品与配置。"
  Pop $0
  ${IfNot} ${FileExists} "$LOCALAPPDATA\PlotKityCat\*.*"
    ${NSD_CreateCheckbox} 0 44u 100% 14u "复制导入旧 ZIP 版的作品和配置（原文件保留）"
    Pop $ImportCheck
    ${NSD_OnClick} $ImportCheck ToggleImport
    ${NSD_CreateText} 0 64u 78% 14u ""
    Pop $ImportEdit
    ${NSD_CreateButton} 80% 64u 20% 14u "选择目录"
    Pop $ImportBrowse
    ${NSD_OnClick} $ImportBrowse BrowseLegacy
    EnableWindow $ImportEdit 0
    EnableWindow $ImportBrowse 0
    ${NSD_CreateLabel} 0 86u 100% 28u "选择包含 PlotKityCat.exe 和 Scripts 的旧目录。导入在首次启动时完成。"
    Pop $0
  ${Else}
    ${NSD_CreateLabel} 0 44u 100% 28u "已有用户数据将继续使用。请先退出正在运行的 PlotKityCat。"
    Pop $0
  ${EndIf}
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:安装"
  nsDialogs::Show
FunctionEnd

Function ToggleImport
  ${NSD_GetState} $ImportCheck $0
  ${If} $0 == ${BST_CHECKED}
    EnableWindow $ImportEdit 1
    EnableWindow $ImportBrowse 1
  ${Else}
    EnableWindow $ImportEdit 0
    EnableWindow $ImportBrowse 0
  ${EndIf}
FunctionEnd

Function BrowseLegacy
  nsDialogs::SelectFolderDialog "选择旧版 PlotKityCat 目录" ""
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $ImportEdit $0
  ${EndIf}
FunctionEnd

Function InstallOptionsLeave
  ${If} $ImportCheck != ""
    ${NSD_GetState} $ImportCheck $0
    ${If} $0 == ${BST_CHECKED}
      ${NSD_GetText} $ImportEdit $LegacySource
      ${IfNot} ${FileExists} "$LegacySource\PlotKityCat.exe"
        MessageBox MB_OK|MB_ICONSTOP "请选择包含 PlotKityCat.exe 的旧版目录。"
        Abort
      ${EndIf}
      ${IfNot} ${FileExists} "$LegacySource\Scripts\*.*"
        MessageBox MB_OK|MB_ICONSTOP "旧版目录缺少 Scripts。"
        Abort
      ${EndIf}
      ${If} ${FileExists} "$LegacySource\.plotkitycat-installed"
        MessageBox MB_OK|MB_ICONSTOP "请选择旧 ZIP 版的目录。安装版数据会自动保留。"
        Abort
      ${EndIf}
      Push "$LegacySource\PlotKityCat.exe"
      Call CheckExecutableUnlocked
    ${Else}
      StrCpy $LegacySource ""
    ${EndIf}
  ${EndIf}
FunctionEnd

; Open for write without sharing: running executables cannot be overwritten.
Function CheckExecutableUnlocked
  Pop $0
  ${If} ${FileExists} "$0"
    System::Call 'kernel32::CreateFileW(w r0, i 0x40000000, i 0, p 0, i 3, i 0, p 0) p.r1'
    ${If} $1 == -1
      MessageBox MB_OK|MB_ICONSTOP "请先退出 PlotKityCat，再进行安装或导入。$\r$\n文件：$0"
      SetErrorLevel 2
      Abort
    ${EndIf}
    System::Call 'kernel32::CloseHandle(p r1)'
  ${EndIf}
FunctionEnd

Function DetectWebView
  StrCpy $0 ""
  SetRegView 32
  ReadRegStr $0 HKLM "${WEBVIEW_KEY}" "pv"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "${WEBVIEW_KEY}" "pv"
  ${EndIf}
  ${If} $0 == ""
    SetRegView 64
    ReadRegStr $0 HKLM "${WEBVIEW_KEY}" "pv"
    ${If} $0 == ""
      ReadRegStr $0 HKCU "${WEBVIEW_KEY}" "pv"
    ${EndIf}
  ${EndIf}
  ${If} $0 == "0.0.0.0"
    StrCpy $0 ""
  ${EndIf}
  SetRegView 64
FunctionEnd

Section "Install"
  ; Keep the installer and updater in a predictable writable per-user path.
  ${If} $INSTDIR != "$LOCALAPPDATA\Programs\PlotKityCat"
    MessageBox MB_OK|MB_ICONSTOP "此安装包使用当前用户的默认安装目录，不支持 /D 更改目录。"
    Abort
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\PlotKityCat.exe"
    ${IfNot} ${FileExists} "$INSTDIR\.plotkitycat-installed"
      MessageBox MB_OK|MB_ICONSTOP "安装目录中存在旧版程序。请先保留并移走该目录，再安装。"
      Abort
    ${EndIf}
  ${EndIf}
  Push "$INSTDIR\PlotKityCat.exe"
  Call CheckExecutableUnlocked
  Call DetectWebView
  ${If} $0 == ""
    DetailPrint "正在安装 WebView2，需要联网..."
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=MicrosoftEdgeWebview2Setup.exe "${WEBVIEW_BOOTSTRAPPER}"
    ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install' $1
    Call DetectWebView
    ${If} $0 == ""
      MessageBox MB_OK|MB_ICONSTOP "WebView2 安装未完成。请连接网络后重试。"
      SetErrorLevel 3
      Abort
    ${EndIf}
  ${EndIf}
  SetOutPath "$INSTDIR"
  SetOverwrite on
  ClearErrors
  File /r "${PAYLOAD_DIR}\*.*"
  IfErrors 0 +3
    MessageBox MB_OK|MB_ICONSTOP "程序文件写入失败，请检查剩余空间和目录权限后重试。"
    Abort
  ; Keep a pending import request through reinstalls until initialization.
  ${If} $LegacySource != ""
    FileOpen $0 "$INSTDIR\.plotkitycat-legacy-source" w
    FileWriteUTF16LE /BOM $0 "$LegacySource"
    FileClose $0
  ${EndIf}
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateDirectory "$SMPROGRAMS\PlotKityCat"
  CreateShortcut "$SMPROGRAMS\PlotKityCat\PlotKityCat.lnk" "$INSTDIR\PlotKityCat.exe"
  CreateShortcut "$SMPROGRAMS\PlotKityCat\卸载.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\PlotKityCat.lnk" "$INSTDIR\PlotKityCat.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "PlotKityCat"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Wingflow"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\PlotKityCat.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\uninstall.exe$\"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '$\"$INSTDIR\uninstall.exe$\" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Function un.onInit
  SetShellVarContext current
  SetRegView 64
  ${If} $INSTDIR != "$LOCALAPPDATA\Programs\PlotKityCat"
    MessageBox MB_OK|MB_ICONSTOP "卸载目录与默认安装目录不一致，已停止卸载。"
    Abort
  ${EndIf}
  ${IfNot} ${FileExists} "$INSTDIR\.plotkitycat-installed"
    MessageBox MB_OK|MB_ICONSTOP "安装标记缺失，已停止卸载。"
    Abort
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\PlotKityCat.exe"
    StrCpy $0 "$INSTDIR\PlotKityCat.exe"
    System::Call 'kernel32::CreateFileW(w r0, i 0x40000000, i 0, p 0, i 3, i 0, p 0) p.r1'
    ${If} $1 == -1
      MessageBox MB_OK|MB_ICONSTOP "请先退出 PlotKityCat，再卸载。"
      Abort
    ${EndIf}
    System::Call 'kernel32::CloseHandle(p r1)'
  ${EndIf}
FunctionEnd

Section "Uninstall"
  Delete "$DESKTOP\PlotKityCat.lnk"
  Delete "$SMPROGRAMS\PlotKityCat\PlotKityCat.lnk"
  Delete "$SMPROGRAMS\PlotKityCat\卸载.lnk"
  RMDir "$SMPROGRAMS\PlotKityCat"
  Delete "$INSTDIR\PlotKityCat.exe"
  Delete "$INSTDIR\.plotkitycat-installed"
  Delete "$INSTDIR\.plotkitycat-legacy-source"
  RMDir /r "$INSTDIR\resources"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  ; Intentionally retain LocalAppData\PlotKityCat (works, config, Runtime).
SectionEnd
