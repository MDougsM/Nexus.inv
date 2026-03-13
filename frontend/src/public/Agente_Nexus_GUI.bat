@echo off
chcp 65001 >nul
powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; iex ((Get-Content -LiteralPath '%~f0' -Encoding UTF8 | Select-Object -Skip 4) -join [Environment]::NewLine)"
exit /b
# =======================================================
# AGENTE NEXUS WPF - AUTO DISCOVERY v2.1.6 (FINAL UTF-8)
# =======================================================
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$BaseURL = "https://unidealistic-colourably-hae.ngrok-free.dev"
$ColetaURL = "$BaseURL/api/inventario/agente/coleta"

# WEBCLIENT NATIVO (Ignora bugs do PowerShell)
$WebClient = New-Object System.Net.WebClient
$WebClient.Encoding = [System.Text.Encoding]::UTF8

# 1. BUSCA SECRETARIAS
Try {
    $JsonSec = $WebClient.DownloadString("$BaseURL/api/unidades/secretarias")
    $Secretarias = $JsonSec | ConvertFrom-Json
} Catch {
    [System.Windows.MessageBox]::Show("Erro ao conectar no Servidor Nexus. Verifique a rede ou se o servidor está ligado!", "Erro", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error)
    exit
}

# 2. DESIGN DA INTERFACE EM XAML
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Nexus.inv - Auto Discovery" Height="480" Width="420"
        WindowStartupLocation="CenterScreen" ResizeMode="NoResize"
        Background="#0F172A" FontFamily="Segoe UI">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="85"/>
            <RowDefinition Height="*"/>
        </Grid.RowDefinitions>

        <Border Background="#1E293B" CornerRadius="0,0,15,15" Margin="0,0,0,5">
            <StackPanel Orientation="Horizontal" VerticalAlignment="Center" Margin="25,0,0,0">
                <TextBlock Text="NEXUS.INV" FontSize="26" FontWeight="Black" Foreground="#F8FAFC"/>
                <TextBlock Text="AGENTE DE COLETA" FontSize="11" FontWeight="Bold" Foreground="#3B82F6" Margin="10,12,0,0"/>
            </StackPanel>
        </Border>

        <StackPanel Grid.Row="1" Margin="30,20,30,20">
            <TextBlock Text="Destino do Equipamento" FontSize="18" FontWeight="Bold" Foreground="#F8FAFC" Margin="0,0,0,25"/>

            <TextBlock Text="SECRETARIA / PRÉDIO" FontSize="11" FontWeight="Bold" Foreground="#94A3B8" Margin="0,0,0,5"/>
            <ComboBox Name="ComboSec" FontSize="15" Padding="6" Height="38"/>

            <TextBlock Text="SETOR / SALA" FontSize="11" FontWeight="Bold" Foreground="#94A3B8" Margin="0,20,0,5"/>
            <ComboBox Name="ComboSetor" FontSize="15" Padding="6" Height="38" IsEnabled="False"/>

            <Button Name="BtnColetar" Content="⚡ Escanear Hardware e Enviar" Height="50" Margin="0,40,0,0"
                    Foreground="White" FontSize="15" FontWeight="Bold" Cursor="Hand" BorderThickness="0">
                <Button.Template>
                    <ControlTemplate TargetType="Button">
                        <Border Background="#2563EB" CornerRadius="10">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                    </ControlTemplate>
                </Button.Template>
            </Button>
        </StackPanel>
    </Grid>
</Window>
"@

# 3. CONSTRUINDO A TELA
$reader = New-Object System.Xml.XmlNodeReader $xaml
$Window = [Windows.Markup.XamlReader]::Load($reader)

$ComboSec = $Window.FindName("ComboSec")
$ComboSetor = $Window.FindName("ComboSetor")
$BtnColetar = $Window.FindName("BtnColetar")

foreach ($sec in $Secretarias) { [void]$ComboSec.Items.Add($sec.nome) }

# EVENTO: ESCOLHER SECRETARIA
$ComboSec.Add_SelectionChanged({
    $ComboSetor.Items.Clear()
    $ComboSetor.IsEnabled = $true
    [void]$ComboSetor.Items.Add("Carregando...")
    $ComboSetor.SelectedIndex = 0

    $secName = $ComboSec.SelectedItem.ToString()
    $secObj = $Secretarias | Where-Object { $_.nome -eq $secName } | Select-Object -First 1

    Try {
        $JsonSet = $WebClient.DownloadString("$BaseURL/api/unidades/secretarias/$($secObj.id)/setores")
        $Setores = $JsonSet | ConvertFrom-Json
        
        $ComboSetor.Items.Clear()
        foreach ($setor in $Setores) { [void]$ComboSetor.Items.Add($setor.nome) }
        if ($ComboSetor.Items.Count -gt 0) { $ComboSetor.SelectedIndex = 0 }
    } Catch {
        $ComboSetor.Items.Clear()
        [void]$ComboSetor.Items.Add("Erro ao carregar")
    }
})

# EVENTO: CLICAR NO BOTÃO
$BtnColetar.Add_Click({
    if (-not $ComboSec.SelectedItem -or -not $ComboSetor.SelectedItem) {
        [System.Windows.MessageBox]::Show("Por favor, selecione a Secretaria e o Setor.", "Atenção", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Warning)
        return
    }

    $BtnColetar.Content = "Coletando dados... Aguarde!"
    $BtnColetar.IsEnabled = $false

    $CS = Get-WmiObject Win32_ComputerSystem
    $CPU = Get-WmiObject Win32_Processor | Select-Object -First 1
    $OS = Get-WmiObject Win32_OperatingSystem
    $Chassis = Get-WmiObject Win32_SystemEnclosure
    
    $Serial = ""
    $Origem = ""

    $BIOS = Get-WmiObject Win32_BIOS | Select-Object -First 1
    if ($BIOS -and $BIOS.SerialNumber -notmatch "Default|O.E.M|To be filled|System|N/A|^\s*$") {
        $Serial = $BIOS.SerialNumber.Trim(); $Origem = "BIOS"
    }
    
    if ($Serial -eq "") {
        $PlacaMae = Get-WmiObject Win32_BaseBoard | Select-Object -First 1
        if ($PlacaMae -and $PlacaMae.SerialNumber -notmatch "Default|O.E.M|To be filled|System|N/A|^\s*$") {
            $Serial = $PlacaMae.SerialNumber.Trim(); $Origem = "Placa-Mãe"
        }
    }

    if ($Serial -eq "") {
        $Produto = Get-WmiObject Win32_ComputerSystemProduct | Select-Object -First 1
        if ($Produto -and $Produto.IdentifyingNumber -notmatch "Default|O.E.M|To be filled|System|N/A|^\s*$") {
            $Serial = $Produto.IdentifyingNumber.Trim(); $Origem = "Produto"
        }
    }

    if ($Serial -eq "") {
        $Produto = Get-WmiObject Win32_ComputerSystemProduct | Select-Object -First 1
        if ($Produto -and $Produto.UUID -notmatch "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF|^\s*$") {
            $Serial = $Produto.UUID.Trim(); $Origem = "UUID"
        }
    }

    if ($Serial -eq "") {
        $CPUID = if ($CPU -and $CPU.ProcessorId) { $CPU.ProcessorId.Trim() } else { "" }
        if ($CPUID -ne "") {
            $Serial = $CPUID; $Origem = "CPU-ID"
        } else {
            $Serial = "Desconhecido"; $Origem = "Erro"
        }
    }

    $SerialFinal = "[$Origem] $Serial"

    $Net = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
    $MacAddress = if ($Net -and $Net.MACAddress) { $Net.MACAddress } else { "Desconhecido" }

    $Discos = Get-WmiObject Win32_DiskDrive | Where-Object { $_.Size -gt 0 -and $_.MediaType -notmatch "Removable" }
    $ListaDiscos = @()
    $TipoDisco = "HD"
    foreach ($d in $Discos) {
        $Tamanho = [math]::Round($d.Size / 1GB)
        $ListaDiscos += "$Tamanho GB ($($d.Model))"
        if ($d.Model -match "SSD") { $TipoDisco = "SSD" }
        if ($d.Model -match "NVMe") { $TipoDisco = "NVMe" }
    }

    $Tipo = "Desktop"
    if (@(8,9,10,11,12,14,18,21,31,32) -contains $Chassis.ChassisTypes[0]) { $Tipo = "Notebook" }

    $JsonPayload = @{
        tipo = $Tipo
        marca = $CS.Manufacturer
        modelo = $CS.Model
        cpu = $CPU.Name.Trim()
        ram = "$([math]::Round($CS.TotalPhysicalMemory / 1GB)) GB"
        os = $OS.Caption
        disco = ($ListaDiscos -join " + ")
        tipo_disco = $TipoDisco
        nome_pc = $env:COMPUTERNAME
        usuario_pc = $env:USERNAME
        serial = $SerialFinal
        mac = $MacAddress
        secretaria = $ComboSec.SelectedItem.ToString()
        setor = $ComboSetor.SelectedItem.ToString()
    } | ConvertTo-Json -Depth 5 -Compress

    $BytesPayload = [System.Text.Encoding]::UTF8.GetBytes($JsonPayload)

    Try {
        # O envio continua com WebRequest normal que já estava cravado e funcionando
        $Res = Invoke-RestMethod -Uri $ColetaURL -Method Post -Body $BytesPayload -ContentType "application/json; charset=utf-8"
        [System.Windows.MessageBox]::Show("Hardware escaneado com sucesso!`n`nPatrimônio Gerado: $($Res.patrimonio)`nS/N: $SerialFinal`nMAC: $MacAddress", "Sucesso", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information)
        $Window.Close()
    } Catch {
        $ServerMsg = if ($_.ErrorDetails) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        [System.Windows.MessageBox]::Show("Erro: $ServerMsg", "Erro Crítico", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error)
        $BtnColetar.Content = "⚡ Escanear Hardware e Enviar"
        $BtnColetar.IsEnabled = $true
    }
})

[void]$Window.ShowDialog()