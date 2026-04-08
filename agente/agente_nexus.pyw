import customtkinter as ctk
import requests
import wmi
import socket
import threading
import pythoncom
import platform
import sys
import os
import time
import subprocess
import winreg
import json
import re
import tempfile
import tkinter.messagebox as mb
from datetime import datetime
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

# ==========================================
# CONFIGURAÇÕES DO AGENTE DEV (LOCALHOST)
# ==========================================
TOKEN_AGENTE = "NEXUS_AGENTE_V5_9b7e1f2a4c6d8e0f3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d"
HEADERS_AUTH = {
    "Content-Type": "application/json",
    "X-Nexus-Token": TOKEN_AGENTE
}

# 🚀 VERSÃO DO AGENTE
VERSAO_DESTE_AGENTE = "6.0"

# ==========================================
# ROTEADOR DINÂMICO (GITHUB GIST)
# ==========================================
URL_DO_GIST = "https://gist.githubusercontent.com/MDougsM/883aefc8a4cb0fe4dc1bc2e8eaf61d6e/raw/9fa3bb4785a818e2dfe6c971f5eed4332d89ae45/nexus_router.txt"

def obter_url_do_servidor():
    try:
        res = requests.get(URL_DO_GIST, timeout=10)
        if res.status_code == 200:
            link = res.text.strip()
            if link.endswith('/'):
                link = link[:-1]
            return link
    except Exception as e:
        print(f"Erro ao buscar o Gist: {e}")
    return "http://localhost:8001"

BASE_URL = obter_url_do_servidor()
COLETA_URL = f"{BASE_URL}/api/inventario/agente/coleta"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

MAPA_UNIDADES = {}
def carregar_dados_organizacionais():
    global MAPA_UNIDADES
    try:
        url_unidades = f"{BASE_URL}/api/unidades/secretarias"
        res = requests.get(url_unidades, headers=HEADERS_AUTH, timeout=10)
        
        if res.status_code == 200:
            secretarias = res.json()
            novo_mapa = {}
            for sec in secretarias:
                nome_sec = sec.get('nome')
                id_sec = sec.get('id')
                lista_setores = []
                if id_sec:
                    try:
                        url_setores = f"{BASE_URL}/api/unidades/secretarias/{id_sec}/setores"
                        res_setores = requests.get(url_setores, headers=HEADERS_AUTH, timeout=5)
                        if res_setores.status_code == 200:
                            lista_setores = [s.get('nome') for s in res_setores.json() if s.get('nome')]
                    except:
                        pass
                
                if not lista_setores: 
                    lista_setores = ["Padrão"]
                    
                novo_mapa[nome_sec] = lista_setores
            
            MAPA_UNIDADES = novo_mapa if novo_mapa else {"Nenhuma Secretaria": ["Padrão"]}
            return True
    except Exception as e:
        print(f"Erro ao carregar unidades: {e}")
    
    MAPA_UNIDADES = {"Servidor Offline": ["Padrão"]}
    return False

def obter_id_persistente():
    caminho_base = os.path.join(os.environ.get('SystemDrive', 'C:'), 'ProgramData', 'NexusInv')
    caminho_id = os.path.join(caminho_base, 'nexus_dna.txt')
    if os.path.exists(caminho_id):
        with open(caminho_id, 'r') as f: return f.read().strip()
    else:
        os.makedirs(caminho_base, exist_ok=True)
        import uuid
        novo_id = str(uuid.uuid4())
        with open(caminho_id, 'w') as f: f.write(novo_id)
        try:
            subprocess.run(['attrib', '+h', caminho_base], creationflags=subprocess.CREATE_NO_WINDOW)
        except: pass
        return novo_id
    
def obter_status_windows():
    try:
        cmd = 'powershell "Get-CimInstance SoftwareLicensingProduct -Filter \'PartialProductKeyIsPresent=1\' | Select-Object LicenseStatus, Description | ConvertTo-Json"'
        out = subprocess.check_output(cmd, shell=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW).strip()
        if out:
            data = json.loads(out)
            if isinstance(data, list): data = data[0]
            status_map = {0: "Não Licenciado", 1: "Licenciado (Ativo)", 2: "OOB Grace", 3: "OOT Grace", 4: "Não Genuíno", 5: "Notificação", "0": "Não Licenciado", "1": "Licenciado (Ativo)", "2": "OOB Grace", "3": "OOT Grace", "4": "Não Genuíno", "5": "Notificação"}
            return {
                "status": status_map.get(str(data.get("LicenseStatus")), "Desconhecido"), 
                "tipo": data.get("Description", "N/A"), 
                "expira": "Perpétua"
            }
    except: pass
    try:
        cmd = 'cscript //nologo c:\\windows\\system32\\slmgr.vbs /dli'
        out = subprocess.check_output(cmd, shell=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
        status = "Desconhecido"
        desc = "N/A"
        for line in out.splitlines():
            if "Nome:" in line or "Name:" in line: desc = line.split(":")[1].strip()
            if "Status da licença:" in line or "License Status:" in line:
                status_raw = line.split(":")[1].strip()
                status = "Licenciado (Ativo)" if "Licenciado" in status_raw or "Licensed" in status_raw else status_raw
        return {"status": status, "tipo": desc, "expira": "Perpétua"}
    except: pass
    return {"status": "Não Identificada", "tipo": "Bloqueado pelo Windows", "expira": "N/A"}

def listar_softwares():
    softwares = []
    chaves_registro = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
    ]
    for hive, path in chaves_registro:
        try:
            with winreg.OpenKey(hive, path) as key:
                for i in range(winreg.QueryInfoKey(key)[0]):
                    try:
                        sub_path = winreg.EnumKey(key, i)
                        with winreg.OpenKey(key, sub_path) as sub_key:
                            nome = winreg.QueryValueEx(sub_key, "DisplayName")[0]
                            try: versao = winreg.QueryValueEx(sub_key, "DisplayVersion")[0]
                            except: versao = "N/A"
                            try: fab = winreg.QueryValueEx(sub_key, "Publisher")[0]
                            except: fab = "Desconhecido"
                            if nome and nome not in [s['nome'] for s in softwares]:
                                softwares.append({"nome": str(nome), "versao": str(versao), "fabricante": str(fab)})
                    except EnvironmentError: continue
        except EnvironmentError: continue
    return softwares

def ler_hardware_maquina(secretaria="Ping Automático", setor="Background", patrimonio_manual="", override=False):
    licenca_result = {"status": "Coletando...", "tipo": "N/A", "expira": "N/A"}
    def coletar_licenca(): licenca_result.update(obter_status_windows())
    thread_licenca = threading.Thread(target=coletar_licenca, daemon=True)
    thread_licenca.start()
    
    pythoncom.CoInitialize()
    try:
        conexao = wmi.WMI()
        sistema = conexao.Win32_ComputerSystem()[0]
        cpu = conexao.Win32_Processor()[0]
        os_info = conexao.Win32_OperatingSystem()[0]
        chassis = conexao.Win32_SystemEnclosure()[0]
        
        # --- REDE, IP EXTERNO E VELOCIDADE ---
        ip_local = "Desconhecido"
        ip_externo = "Desconhecido"
        mac_address = "Desconhecido"
        redes_detalhes = []
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_local = s.getsockname()[0]
            s.close()
        except: pass
        try:
            ip_externo = requests.get('https://api.ipify.org', timeout=3).text
        except: pass

        try:
            for net in conexao.Win32_NetworkAdapter(PhysicalAdapter=True):
                if net.MACAddress:
                    ip_addrs = []
                    config = net.associators(wmi_result_class="Win32_NetworkAdapterConfiguration")
                    if config and config[0].IPAddress:
                        ip_addrs = config[0].IPAddress
                        if mac_address == "Desconhecido": mac_address = net.MACAddress
                    status_str = "Ativo" if net.NetConnectionStatus == 2 else "Inativo"
                    velocidade = round(int(net.Speed) / 1000000) if net.Speed else 0
                    redes_detalhes.append({
                        "descricao": net.Name,
                        "ip": ip_addrs[0] if ip_addrs else "N/A",
                        "mac": net.MACAddress,
                        "status": status_str,
                        "velocidade": velocidade
                    })
        except: pass
        
        serial = conexao.Win32_BIOS()[0].SerialNumber.strip()
        placa_mae = "Desconhecida"
        try: 
            bb = conexao.Win32_BaseBoard()[0]
            placa_mae = bb.Product.strip()
            if not serial or serial in ["Default string", "O.E.M."]: serial = bb.SerialNumber.strip()
        except: pass

        discos_resumo = []
        tipo_disco = "HD"
        saude_armazenamento = "OK (Saudável)"
        try:
            status_ruins = 0
            for d in conexao.Win32_DiskDrive():
                if d.Size:
                    discos_resumo.append(f"{round(int(d.Size) / (1024**3))}GB")
                    if "SSD" in d.Model or "NVMe" in d.Model: tipo_disco = "SSD"
                if d.Status and d.Status.upper() not in ["OK", "OKAY"]:
                    status_ruins += 1
            if status_ruins > 0: saude_armazenamento = "⚠️ Alerta S.M.A.R.T"
        except: saude_armazenamento = "Não Suportado"

        discos_detalhes = []
        try:
            for d in conexao.Win32_LogicalDisk(DriveType=3): discos_detalhes.append({"drive": d.DeviceID, "tamanho_gb": round(int(d.Size or 0)/(1024**3), 1), "livre_gb": round(int(d.FreeSpace or 0)/(1024**3), 1)})
        except: pass

        gpus = []
        try:
            for gpu in conexao.Win32_VideoController(): gpus.append({"nome": gpu.Name, "vram_mb": round(abs(int(gpu.AdapterRAM or 0))/(1024**2)) if gpu.AdapterRAM else "N/A", "driver": gpu.DriverVersion})
        except: pass

        telemetria = {"cpu_percent": cpu.LoadPercentage, "ram_percent": 0}
        try: telemetria["ram_percent"] = round(100 - ((int(os_info.FreePhysicalMemory) / int(os_info.TotalVisibleMemorySize)) * 100))
        except: pass

        slots_ram = []
        try:
            for mem in conexao.Win32_PhysicalMemory(): slots_ram.append({"capacidade_gb": round(int(mem.Capacity)/(1024**3)), "velocidade_mhz": mem.Speed or "N/A", "fabricante": mem.Manufacturer or "Desconhecido", "slot": mem.DeviceLocator or "Desconhecido"})
        except: pass

        impressoras = []
        try: impressoras = [{"nome": i.Name, "porta": i.PortName or "N/A", "tipo": "Rede" if i.Network else "Local/USB", "padrao": i.Default} for i in conexao.Win32_Printer()]
        except: pass

        perifericos_imagem = []
        try: perifericos_imagem = [p.Name for p in conexao.Win32_PnPEntity(PNPClass="Image") if p.Name]
        except: pass

        servicos_rodando = []
        try:
            for srv in conexao.Win32_Service():
                if srv.State == "Running": servicos_rodando.append({"nome": srv.Name, "display": srv.DisplayName})
        except: pass

        lista_av = []
        try:
            for av in wmi.WMI(namespace="root\\SecurityCenter2").AntivirusProduct():
                st = "Ativo" if (int(av.productState) & 0x1000) or (int(av.productState) & 0x0100) else "Desativado"
                lista_av.append({"nome": av.displayName, "status": st})
        except: lista_av.append({"nome": "Windows Defender", "status": "Ativo"})

        status_bitlocker = "Desconhecido"
        try:
            bl_out = subprocess.check_output(['manage-bde', '-status', 'C:'], creationflags=subprocess.CREATE_NO_WINDOW, text=True)
            status_bitlocker = "Ativo (Protegido)" if "Protection On" in bl_out or "Proteção Ativada" in bl_out else "Desativado"
        except: status_bitlocker = "Sem Acesso Admin"

        chave_windows = "Não encontrada / OEM Oculta"
        try:
            for sls in conexao.SoftwareLicensingService():
                if sls.OA3xOriginalProductKey:
                    chave_windows = sls.OA3xOriginalProductKey
                    break
        except: pass

        uptime_str = "N/A"
        try:
            boot_time = datetime.strptime(os_info.LastBootUpTime.split('.')[0], "%Y%m%d%H%M%S")
            diff = datetime.now() - boot_time
            uptime_str = f"{diff.days}d {diff.seconds//3600}h {(diff.seconds//60)%60}m"
        except: pass

        monitores_brutos = []
        try:
            for mon in conexao.Win32_PnPEntity(Service="monitor"):
                nome_raw = mon.Name or mon.Caption
                if nome_raw:
                    match = re.search(r'\((.*?)\)', nome_raw)
                    nome_limpo = match.group(1).strip() if match else nome_raw.replace("Generic Monitor", "").replace("Monitor Genérico", "").replace("PnP", "").strip()
                    if nome_limpo: monitores_brutos.append(nome_limpo)
            if not monitores_brutos:
                for m in conexao.Win32_DesktopMonitor():
                    if m.Caption:
                        match = re.search(r'\((.*?)\)', m.Caption)
                        nome_limpo = match.group(1).strip() if match else m.Caption.replace("Generic Monitor", "").replace("Monitor Genérico", "").replace("PnP", "").strip()
                        if nome_limpo: monitores_brutos.append(nome_limpo)
            from collections import Counter
            contagem = Counter(monitores_brutos)
            monitores_conectados = [f"{qtd}x {nome}" if qtd > 1 else nome for nome, qtd in contagem.items()]
        except: monitores_conectados = []

        tipo_maq = "Notebook" if chassis.ChassisTypes[0] in [8, 9, 10, 11, 12, 14] else "Desktop"
        boot_programs = []
        try: boot_programs = [s.Name for s in conexao.Win32_StartupCommand() if s.Name]
        except: pass

        thread_licenca.join(timeout=8)

        return {
            "uuid_persistente": obter_id_persistente(), 
            "tipo": tipo_maq, 
            "marca": sistema.Manufacturer.strip() if sistema.Manufacturer else "Desconhecido", 
            "modelo": sistema.Model.strip() if sistema.Model else "Desconhecido",
            "cpu": cpu.Name.strip() if cpu.Name else "Desconhecido", 
            "ram": f"{round(int(sistema.TotalPhysicalMemory or 0) / (1024**3))}GB",
            "os": os_info.Caption.strip() if os_info.Caption else "Desconhecido", 
            "disco": " + ".join(discos_resumo) if discos_resumo else "Desconhecido", 
            "tipo_disco": tipo_disco,
            "nome_pc": platform.node(), 
            "usuario_pc": sistema.UserName or "Nenhum",
            "serial": serial, 
            "mac": mac_address, 
            "ip": ip_local,
            "secretaria": secretaria, 
            "setor": setor,
            "patrimonio_manual": patrimonio_manual, 
            "override_patrimonio": override,
            
            "dados_avancados": {
                "ip_externo": ip_externo,
                "licenca_key": chave_windows,
                "placa_mae": placa_mae,
                "nucleos_cpu": cpu.NumberOfLogicalProcessors,
                "telemetria": telemetria,
                "gpu": gpus,
                "discos_logicos": discos_detalhes,
                "redes": redes_detalhes,
                "softwares": listar_softwares(),
                "servicos": servicos_rodando,
                "memoria_ram_slots": slots_ram,
                "impressoras": impressoras,
                "scanners_e_webcams": perifericos_imagem,
                "seguranca": {
                    "antivirus": lista_av,
                    "bitlocker": status_bitlocker,
                    "licenca_windows": licenca_result
                },
                "saude": {
                    "uptime": uptime_str,
                    "armazenamento": saude_armazenamento
                },
                "inicializacao": boot_programs,
                "perifericos": {
                    "monitores": monitores_conectados
                }
            }
        }
    except Exception as e:
        print(f"Erro na coleta: {e}")
        return None
    finally:
        pythoncom.CoUninitialize()

def enviar_para_servidor(payload):
    try:
        res = requests.post(COLETA_URL, json=payload, headers=HEADERS_AUTH, timeout=40)
        return res.status_code == 200, res.json() if res.status_code == 200 else res.text
    except Exception as e:
        return False, str(e)

class NexusAgent(ctk.CTk):
    def __init__(self, base_url, meu_uuid):
        super().__init__()
        self.base_url = base_url
        self.meu_uuid = meu_uuid
        self.versao_atual = VERSAO_DESTE_AGENTE
        
        carregar_dados_organizacionais()
        
        self.title(f"Nexus Agent [PROD] v{self.versao_atual}")
        self.geometry("450x750")
        
        self.frame = ctk.CTkFrame(self)
        self.frame.pack(pady=10, padx=10, fill="both", expand=True)

        ctk.CTkLabel(self.frame, text="Nexus Agent - Auditoria Avançada", font=("Arial", 16, "bold")).pack(pady=15)

        ctk.CTkLabel(self.frame, text="Secretaria:").pack(anchor="w", padx=20)
        lista_sec = list(MAPA_UNIDADES.keys())
        self.combo_secretaria = ctk.CTkOptionMenu(self.frame, values=lista_sec, command=self.atualizar_setores_dinamicamente)
        self.combo_secretaria.pack(fill="x", padx=20, pady=5)

        ctk.CTkLabel(self.frame, text="Setor:").pack(anchor="w", padx=20)
        setores_iniciais = MAPA_UNIDADES.get(lista_sec[0], ["Padrão"]) if lista_sec else ["Padrão"]
        self.combo_setor = ctk.CTkOptionMenu(self.frame, values=setores_iniciais)
        self.combo_setor.pack(fill="x", padx=20, pady=5)

        ctk.CTkLabel(self.frame, text="Número de Patrimônio:").pack(anchor="w", padx=20)
        self.entry_patrimonio = ctk.CTkEntry(self.frame, placeholder_text="Ex: 00131")
        self.entry_patrimonio.pack(fill="x", padx=20, pady=5)

        self.check_override = ctk.CTkCheckBox(self.frame, text="Forçar atualização de patrimônio no servidor")
        self.check_override.pack(anchor="w", padx=20, pady=10)

        self.btn_sync = ctk.CTkButton(self.frame, text="Sincronizar com Servidor", command=self.sincronizar_manual, fg_color="#2563eb", hover_color="#1d4ed8", font=("Arial", 13, "bold"), height=40)
        self.btn_sync.pack(pady=20, padx=20, fill="x")

        ctk.CTkLabel(self.frame, text="Atividades do Agente:").pack(anchor="w", padx=20)
        self.textbox_log = ctk.CTkTextbox(self.frame, height=220, font=("Consolas", 11))
        self.textbox_log.pack(fill="both", expand=True, padx=20, pady=10)
        self.textbox_log.configure(state="disabled")

        self.log(f"Agente iniciado. ID: {self.meu_uuid}")
        
        threading.Thread(target=self.escutar_comandos_c2, daemon=True).start()
        threading.Thread(target=self.checar_atualizacoes_background, daemon=True).start()

    def log(self, mensagem):
        self.textbox_log.configure(state="normal")
        self.textbox_log.insert("end", f"[{time.strftime('%H:%M:%S')}] {mensagem}\n")
        self.textbox_log.see("end")
        self.textbox_log.configure(state="disabled")

    def atualizar_setores_dinamicamente(self, escolha):
        novos_setores = MAPA_UNIDADES.get(escolha, ["Padrão"])
        self.combo_setor.configure(values=novos_setores)
        self.combo_setor.set(novos_setores[0])
        self.log(f"Filtro aplicado: {escolha}")

    def sincronizar_manual(self):
        self.log("📦 Iniciando coleta profunda de dados...")
        self.btn_sync.configure(state="disabled", text="Coletando...")
        def tarefa():
            sec = self.combo_secretaria.get()
            setor = self.combo_setor.get()
            pat = self.entry_patrimonio.get()
            override = (self.check_override.get() == 1)

            dados = ler_hardware_maquina(sec, setor, pat, override)
            if not dados:
                self.log("❌ Falha crítica na coleta de hardware.")
                self.after(0, lambda: self.btn_sync.configure(state="normal", text="Sincronizar com Servidor"))
                return

            self.log("📡 Enviando dados para a nuvem Nexus...")
            sucesso, resposta = enviar_para_servidor(dados)
            if sucesso:
                self.log("✅ Sincronização concluída com sucesso!")
                self.after(0, lambda: mb.showinfo("Sucesso", "Inventário e auditoria atualizados!"))
            else:
                self.log(f"⚠️ Erro no servidor: {resposta}")
                self.after(0, lambda: mb.showerror("Erro", f"Falha na comunicação: {resposta}"))
            self.after(0, lambda: self.btn_sync.configure(state="normal", text="Sincronizar com Servidor"))
        threading.Thread(target=tarefa, daemon=True).start()

    def escutar_comandos_c2(self):
        self.log("🛡️ Escuta de comandos remotos (C2) ativada.")
        url_pendentes = f"{self.base_url}/api/agente/comandos/pendentes/{self.meu_uuid}"
        while True:
            try:
                res = requests.get(url_pendentes, headers=HEADERS_AUTH, timeout=10)
                if res.status_code == 200:
                    dados = res.json()
                    if isinstance(dados, dict) and dados.get("tem_comando") is False: pass
                    elif not dados: pass
                    else:
                        self.log(f"🔍 PACOTE C2 RECEBIDO: {dados}")
                        lista_comandos = []
                        if isinstance(dados, list): lista_comandos = dados
                        elif isinstance(dados, dict):
                            if "comando" in dados: lista_comandos = [dados["comando"]]
                            elif "comandos" in dados: lista_comandos = dados["comandos"]
                            elif "script_content" in dados: lista_comandos = [dados]

                        for cmd in lista_comandos:
                            if not isinstance(cmd, dict): continue
                            cmd_id = cmd.get("id") or cmd.get("comando_id")
                            script = cmd.get("script_content")
                            if not script: script = cmd.get("script", "")
                            if not cmd_id or not script: continue

                            self.log(f"⚡ Executando ordem ID: {cmd_id}...")
                            try:
                                processo = subprocess.run(["powershell", "-Command", script], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW, timeout=60)
                                saida = processo.stdout if processo.stdout else processo.stderr
                                status = "CONCLUIDO" if processo.returncode == 0 else "ERRO"
                                if not saida or not saida.strip(): saida = "Comando executado silenciosamente (sem saída visual)."
                            except Exception as e:
                                saida = f"Erro ao rodar PowerShell: {str(e)}"
                                status = "ERRO"

                            self.log(f"📤 Enviando resposta do comando {cmd_id}...")
                            url_resposta = f"{self.base_url}/api/agente/comandos/resultado"
                            payload = {"comando_id": cmd_id, "status": status, "output_log": saida}
                            res_post = requests.post(url_resposta, json=payload, headers=HEADERS_AUTH, timeout=10)
                            if res_post.status_code == 200: self.log(f"✅ Sucesso! Resposta devolvida.")
                            else: self.log(f"❌ Erro ao devolver resposta: HTTP {res_post.status_code}")
            except: pass
            time.sleep(30)

    def checar_atualizacoes_background(self):
        self.log(f"🔄 Auto-Atualização ativada (Versão: v{self.versao_atual})")
        url_versao = f"{self.base_url}/api/inventario/agente/versao"
        url_download = f"{self.base_url}/api/inventario/download/agente"
        
        while True:
            try:
                res = requests.get(url_versao, headers=HEADERS_AUTH, timeout=10)
                if res.status_code == 200:
                    dados = res.json()
                    versao_servidor = dados.get("versao_atual")
                    
                    if versao_servidor and versao_servidor != self.versao_atual:
                        self.log(f"📦 NOVA VERSÃO DETECTADA! (Atual: {self.versao_atual} -> Nova: {versao_servidor})")
                        
                        if not getattr(sys, 'frozen', False):
                            self.log("⚠️ Rodando no VS Code. Atualização ignorada.")
                            time.sleep(3600)
                            continue
                        
                        self.log("⏳ Baixando o novo Instalador silenciosamente...")
                        
                        try:
                            # stream=True baixa o arquivo em partes, sem estourar a memória
                            res_down = requests.get(url_download, headers=HEADERS_AUTH, timeout=120, stream=True)
                            
                            if res_down.status_code == 200:
                                pasta_temp = tempfile.gettempdir()
                                caminho_instalador = os.path.join(pasta_temp, "Nexus_Update_Temp.exe")
                                
                                # Salva no disco aos poucos
                                with open(caminho_instalador, 'wb') as f:
                                    for chunk in res_down.iter_content(chunk_size=8192):
                                        f.write(chunk)
                                
                                # Verifica se o que foi salvo é realmente um EXE (lendo os 2 primeiros bytes "MZ")
                                with open(caminho_instalador, 'rb') as f:
                                    cabecalho = f.read(2)
                                
                                if cabecalho == b'MZ':
                                    self.log("✅ Download concluído! Iniciando instalação...")
                                    
                                    # Manda o Windows contar até 4 e rodar o instalador
                                    comando_ninja = f'cmd.exe /c ping 127.0.0.1 -n 4 > nul && "{caminho_instalador}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
                                    subprocess.Popen(comando_ninja, creationflags=subprocess.CREATE_NO_WINDOW)
                                    
                                    # Morte súbita para soltar o arquivo .exe atual
                                    os._exit(0)
                                else:
                                    self.log("❌ Falha: O arquivo baixado não é um executável válido.")
                            else:
                                self.log(f"❌ Falha HTTP no servidor: Código {res_down.status_code}")
                                
                        except Exception as down_err:
                            self.log(f"❌ Erro durante o download: {str(down_err)}")

            except Exception as e:
                self.log(f"❌ Erro na checagem de update: {str(e)}")
                
            time.sleep(3600)

if __name__ == "__main__":
    try:
        uuid_maquina = obter_id_persistente()
        app = NexusAgent(BASE_URL, uuid_maquina)
        app.mainloop()
    except Exception as e:
        print(f"Erro ao iniciar aplicação: {e}")