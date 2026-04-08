[Setup]
AppName=Nexus Agent
AppVersion=6.0
AppPublisher=Nexus System
DefaultDirName={pf}\NexusAgent
DisableProgramGroupPage=yes
OutputBaseFilename=Nexus_Instalador_v6.0
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
CloseApplications=force

[Dirs]
Name: "{app}"; Permissions: users-full

; 🚀 A MÁGICA ESTÁ AQUI: Apaga a pasta velha inteira antes de instalar a nova!
[InstallDelete]
Type: filesandordirs; Name: "{app}\*"

[Files]
Source: "C:\NexusInv\agente\dist\agente_nexus.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commonprograms}\Nexus Agent"; Filename: "{app}\agente_nexus.exe"

[Run]
; 1. Libera o Windows Defender
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Add-MpPreference -ExclusionPath '{app}'"""; Flags: runhidden waituntilterminated

; 2. Cria a Tarefa Agendada no BOOT como SYSTEM (Imortal)
Filename: "schtasks"; Parameters: "/Create /SC ONSTART /TN ""NexusWatchdog"" /TR ""\""{app}\agente_nexus.exe\"""" /RU ""SYSTEM"" /RL HIGHEST /F"; Flags: runhidden

; 3. DISPARO IMEDIATO
Filename: "schtasks"; Parameters: "/Run /TN ""NexusWatchdog"""; Flags: runhidden

[UninstallRun]
Filename: "schtasks"; Parameters: "/Delete /TN ""NexusWatchdog"" /F"; Flags: runhidden; RunOnceId: "DeletarWatchdogNexusAgente"
Filename: "cmd.exe"; Parameters: "/c taskkill /F /IM agente_nexus.exe /T"; Flags: runhidden waituntilterminated; RunOnceId: "MatarProcessoNexusAgente"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    // 1. Pausa a Tarefa Agendada
    Exec('schtasks', '/Change /TN "NexusWatchdog" /Disable', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 2. Mata o processo NOVO (se estiver rodando)
    Exec('cmd.exe', '/c taskkill /F /IM agente_nexus.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 3. Mata o processo ANTIGO FANTASMA (o que está no seu print)
    Exec('cmd.exe', '/c taskkill /F /IM Nexus_Agente.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 4. Aguarda 5 segundos para o disco rígido e o Windows liberarem a pasta
    Sleep(5000); 
  end;
end;