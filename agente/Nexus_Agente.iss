[Setup]
AppName=Nexus Agente Auto Discovery
AppVersion=5.5
AppPublisher=Nexus System
DefaultDirName=C:\Nexus.inv
DisableProgramGroupPage=yes
OutputBaseFilename=Nexus_Instalador_v5.5
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
; Força o instalador a tentar fechar aplicações se puder
CloseApplications=force

[Files]
; O Source aponta para o .exe gerado pelo PyInstaller (modo --onefile)
Source: "C:\NexusInv\agente\dist\Nexus_Agente.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commonprograms}\Nexus Agente"; Filename: "{app}\Nexus_Agente.exe"
; A linha do commonstartup foi removida para evitar conflito com o Watchdog

[Run]
; 1. Libera o Windows Defender para não bloquear a automação de C2
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Add-MpPreference -ExclusionPath '{app}'"""; Flags: runhidden waituntilterminated

; 2. 🚀 A MÁGICA DO AUTO-UPDATE: Cria a Tarefa Agendada rodando como SYSTEM (Deus)
; Isso garante que quando o agente atualizar em background, o Windows não peça permissão (UAC)
Filename: "schtasks"; Parameters: "/Create /SC ONLOGON /TN ""NexusWatchdog"" /TR ""'{app}\Nexus_Agente.exe' --silent"" /RU ""SYSTEM"" /RL HIGHEST /F"; Flags: runhidden

; 3. Inicia o agente NORMALMENTE (Com a tela visual) para o técnico fazer a primeira vinculação
Filename: "{app}\Nexus_Agente.exe"; Description: "Abrir Nexus Agente para Cadastro"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; 🚀 DESINSTALAÇÃO LIMPA: Remove a tarefa e MATA o processo invisível antes de apagar a pasta
Filename: "schtasks"; Parameters: "/Delete /TN ""NexusWatchdog"" /F"; Flags: runhidden; RunOnceId: "DeletarWatchdogNexusAgente"
Filename: "cmd.exe"; Parameters: "/c taskkill /F /IM Nexus_Agente.exe /T"; Flags: runhidden waituntilterminated; RunOnceId: "MatarProcessoNexusAgente"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    // 1. Desativa temporariamente para ele não reviver o Agente enquanto instalamos
    Exec('schtasks', '/Change /TN "NexusWatchdog" /Disable', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 2. Mata o processo do Agente com força bruta (/F) e toda a sua árvore (/T)
    Exec('cmd.exe', '/c taskkill /F /IM Nexus_Agente.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 3. Dá 2 segundos de respiro pro Windows soltar o arquivo antigo do disco
    Sleep(2000);
  end;
end;