[Setup]
AppName=Nexus Agente Auto Discovery
AppVersion=6.0
AppPublisher=Nexus System
; 🚀 MUDANÇA 1: Instalando na ProgramData (Pasta Oculta e Protegida do Windows)
DefaultDirName={commonappdata}\Nexus_Agent
DisableProgramGroupPage=yes
OutputBaseFilename=Nexus_Instalador_v6.0
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
; Força o instalador a tentar fechar aplicações se puder
CloseApplications=force

[Files]
; O Source aponta para o .exe gerado pelo PyInstaller (modo --onefile)
Source: "C:\NexusInv\agente\dist\Nexus_Agente.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Mantém um atalho no Menu Iniciar apenas para o técnico abrir se precisar reconfigurar
Name: "{commonprograms}\Nexus Agente"; Filename: "{app}\Nexus_Agente.exe"

[Run]
; 1. Libera o Windows Defender para não bloquear a automação de C2
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Add-MpPreference -ExclusionPath '{app}'"""; Flags: runhidden waituntilterminated

; 2. 🚀 A MÁGICA DO MILVUS: Cria a Tarefa Agendada no BOOT (ONSTART) rodando como SYSTEM (Deus)
; Isso faz o agente iniciar invisível assim que o PC liga, sem precisar de login de usuário!
Filename: "schtasks"; Parameters: "/Create /SC ONSTART /TN ""NexusWatchdog"" /TR ""\""{app}\Nexus_Agente.exe\"""" /RU ""SYSTEM"" /RL HIGHEST /F"; Flags: runhidden

; 3. 🚀 DISPARO IMEDIATO: Se a instalação for furtiva (pelo nosso painel web), ele já inicia a tarefa em background na hora
Filename: "schtasks"; Parameters: "/Run /TN ""NexusWatchdog"""; Flags: runhidden

; 4. Inicia a interface gráfica para o técnico APENAS se a instalação for manual (2 cliques do mouse)
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