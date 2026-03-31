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
import tempfile
import subprocess
import tkinter.messagebox as mb

# ==========================================
# CONFIGURAÇÕES DO AGENTE E ROTEAMENTO
# ==========================================
# 🚀 ADICIONE O CRACHÁ AQUI NO TOPO:
TOKEN_AGENTE = "NEXUS_AGENTE_V5_9b7e1f2a4c6d8e0f3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d"
HEADERS_AUTH = {
    "Content-Type": "application/json",
    "X-Nexus-Token": TOKEN_AGENTE
}

LINK_ROTEADOR = "https://gist.githubusercontent.com/MDougsM/883aefc8a4cb0fe4dc1bc2e8eaf61d6e/raw/nexus_router.txt"
VERSAO_DESTE_AGENTE = "5.5"
ARQUIVO_CACHE_LINK = os.path.join(os.environ.get('SystemDrive', 'C:'), '\\Nexus.inv', 'nexus_link_cache.txt')

def obter_url_backend():
    try:
        res = requests.get(LINK_ROTEADOR, timeout=1.5)
        if res.status_code == 200:
            link_novo = res.text.strip()
            if link_novo.endswith('/'): link_novo = link_novo[:-1]
            os.makedirs(os.path.dirname(ARQUIVO_CACHE_LINK), exist_ok=True)
            with open(ARQUIVO_CACHE_LINK, "w", encoding="utf-8") as f:
                f.write(link_novo)
            return link_novo
    except: pass
    
    if os.path.exists(ARQUIVO_CACHE_LINK):
        with open(ARQUIVO_CACHE_LINK, "r", encoding="utf-8") as f:
            return f.read().strip()
    return "https://catalogue-vermont-united-reveal.trycloudflare.com"

BASE_URL = obter_url_backend()
COLETA_URL = f"{BASE_URL}/api/inventario/agente/coleta"
VERSAO_URL = f"{BASE_URL}/api/inventario/agente/versao"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

def normalizar_versao(versao):
    try:
        return tuple(int(parte) for parte in str(versao).strip().split('.'))
    except Exception:
        return (0,)

def auto_atualizar():
    """Baixa o instalador mais recente e atualiza de forma furtiva (Sem UAC se rodar como SYSTEM)"""
    try:
        res = requests.get(VERSAO_URL, timeout=10)
        if res.status_code == 200:
            dados = res.json()
            
            # Se a versão da API for maior que a versão escrita neste arquivo...
            if normalizar_versao(dados.get("versao_atual", "0")) > normalizar_versao(VERSAO_DESTE_AGENTE):
                url_download = f"{BASE_URL}{dados.get('url_download')}"
                pasta_temp = tempfile.gettempdir()
                caminho_instalador = os.path.join(pasta_temp, "Nexus_Update_v_nova.exe")
                
                # Faz o download do arquivo novo
                resposta_arquivo = requests.get(url_download, stream=True, timeout=30)
                if resposta_arquivo.status_code == 200:
                    with open(caminho_instalador, 'wb') as f:
                        for chunk in resposta_arquivo.iter_content(chunk_size=8192): 
                            f.write(chunk)
                    
                    # Dispara o instalador de forma FURTIVA (Sem tela, sem caixa de diálogo, sem reiniciar o PC)
                    subprocess.Popen(
                        [caminho_instalador, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'],
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                    
                    # 🚀 O SUICÍDIO TÁTICO: O agente desliga imediatamente para o instalador poder sobrescrever o .exe
                    os._exit(0) 
    except Exception as e:
        # Falhas de rede ou timeout na verificação serão ignoradas silenciosamente
        pass

def obter_id_persistente():
    caminho_id = os.path.join(os.environ.get('SystemDrive', 'C:'), '\\Nexus.inv', 'nexus_dna.txt')
    if os.path.exists(caminho_id):
        with open(caminho_id, 'r') as f: return f.read().strip()
    else:
        os.makedirs(os.path.dirname(caminho_id), exist_ok=True)
        import uuid
        novo_id = str(uuid.uuid4())
        with open(caminho_id, 'w') as f: f.write(novo_id)
        try: subprocess.run(['attrib', '+h', caminho_id], creationflags=subprocess.CREATE_NO_WINDOW)
        except: pass
        return novo_id

def ler_hardware_maquina(secretaria="Ping Automático", setor="Background", patrimonio_manual="", override=False):
    pythoncom.CoInitialize()
    try:
        conexao = wmi.WMI()
        sistema = conexao.Win32_ComputerSystem()[0]
        bios = conexao.Win32_BIOS()[0]
        cpu = conexao.Win32_Processor()[0]
        os_info = conexao.Win32_OperatingSystem()[0]
        chassis = conexao.Win32_SystemEnclosure()[0]
        
        ip_local = "Desconhecido"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_local = s.getsockname()[0]
            s.close()
        except: pass

        mac_address = "Desconhecido"
        for net in conexao.Win32_NetworkAdapterConfiguration(IPEnabled=True):
            mac_address = net.MACAddress
            break

        serial = bios.SerialNumber.strip()
        if not serial or serial in ["Default string", "O.E.M."]:
            try: serial = conexao.Win32_BaseBoard()[0].SerialNumber.strip()
            except: serial = "Não identificado"

        discos = []
        tipo_disco = "HD"
        for d in conexao.Win32_DiskDrive():
            if d.Size:
                tamanho = round(int(d.Size) / (1024**3))
                discos.append(f"{tamanho}GB")
                if "SSD" in d.Model or "NVMe" in d.Model: tipo_disco = "SSD"

        tipo_maq = "Notebook" if chassis.ChassisTypes[0] in [8, 9, 10, 11, 12, 14, 18, 21, 31, 32] else "Desktop"

        return {
            "uuid_persistente": obter_id_persistente(), 
            "tipo": tipo_maq, 
            "marca": sistema.Manufacturer.strip(), 
            "modelo": sistema.Model.strip(),
            "cpu": cpu.Name.strip(), 
            "ram": f"{round(int(sistema.TotalPhysicalMemory) / (1024**3))}GB",
            "os": os_info.Caption.strip(), 
            "disco": " + ".join(discos), 
            "tipo_disco": tipo_disco,
            "nome_pc": platform.node(), 
            "usuario_pc": sistema.UserName if sistema.UserName else "Nenhum",
            "serial": serial, 
            "mac": mac_address, 
            "ip": ip_local,
            "secretaria": secretaria, 
            "setor": setor,
            "patrimonio_manual": patrimonio_manual, 
            "override_patrimonio": override 
        }
    except Exception as e:
        return None
    finally:
        pythoncom.CoUninitialize() # Previne memory leaks na thread

def enviar_para_servidor(payload):
    try:
        # 🚀 Enviando a coleta com o crachá!
        res = requests.post(COLETA_URL, json=payload, headers=HEADERS_AUTH, timeout=15)
        return res.status_code == 200, res.json() if res.status_code == 200 else res.text
    except Exception as e:
        return False, str(e)


# ==========================================
# INTERFACE GRÁFICA DO AGENTE (UI PREMIUM)
# ==========================================
class NexusAgent(ctk.CTk):

    def __init__(self, base_url, meu_uuid):
        super().__init__()
        self.base_url = base_url
        self.meu_uuid = meu_uuid
        
        self.title(f"Nexus Agent v{VERSAO_DESTE_AGENTE}")
        self.geometry("450x800")
        self.resizable(False, False)
        
        self.secretarias_data = []
        self.dados_hardware = None 
        
        self.construir_interface()
        self.carregar_secretarias()
        
        # Inicia a escuta de comandos C2 focada na UI
        threading.Thread(target=self.escutar_comandos_c2, daemon=True).start()
        threading.Thread(target=self.carregar_resumo_tela, daemon=True).start()

    def ao_fechar_tela(self):
        """Oculta a tela, mas mantém o programa vivo enviando Heartbeats."""
        self.withdraw()
        self.escrever_log("ℹ️ Tela minimizada. Operando em background.")
        threading.Thread(target=self.loop_silencioso, daemon=True).start()

    def loop_silencioso(self):
        while True:
            try:
                # auto_atualizar() -> DESATIVADO PARA NÃO ACIONAR O UAC DO WINDOWS
                payload_bg = ler_hardware_maquina("Ping Automático", "Background")
                if payload_bg:
                    enviar_para_servidor(payload_bg)
            except: pass
            time.sleep(3600)

    # --- NOVO SISTEMA DE LOGS NA TELA ---
    def escrever_log(self, mensagem):
        """Escreve na aba de terminal do Agente de forma Thread-Safe"""
        try:
            agora = time.strftime("%H:%M:%S")
            linha = f"[{agora}] {mensagem}\n"
            print(linha.strip())
            
            def atualizar_ui():
                self.textbox_logs.configure(state="normal")
                self.textbox_logs.insert("end", linha)
                self.textbox_logs.see("end")
                self.textbox_logs.configure(state="disabled")
                
            self.after(0, atualizar_ui)
        except: pass

    def popup_moderno(self, titulo, mensagem, cor_destaque="#10B981"):
        pop = ctk.CTkToplevel(self)
        pop.title(titulo)
        x = self.winfo_x() + (self.winfo_width() // 2) - (350 // 2)
        y = self.winfo_y() + (self.winfo_height() // 2) - (220 // 2)
        pop.geometry(f"350x220+{x}+{y}")
        pop.attributes("-topmost", True)
        pop.resizable(False, False)
        pop.grab_set() 
        ctk.CTkLabel(pop, text=titulo.upper(), font=ctk.CTkFont(size=14, weight="bold"), text_color=cor_destaque).pack(pady=(20, 10))
        ctk.CTkLabel(pop, text=mensagem, wraplength=300, justify="center").pack(pady=10)
        ctk.CTkButton(pop, text="OK", command=pop.destroy, fg_color=cor_destaque, hover_color="#059669").pack(pady=15)

    def criar_card_info(self, pai, icone, titulo, valor, row, col):
        frame = ctk.CTkFrame(pai, fg_color="#18181B", corner_radius=10)
        frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")
        ctk.CTkLabel(frame, text=icone, font=ctk.CTkFont(size=20)).pack(side="left", padx=(10, 5), pady=10)
        info_frame = ctk.CTkFrame(frame, fg_color="transparent")
        info_frame.pack(side="left", fill="x", expand=True, padx=(0, 10), pady=5)
        ctk.CTkLabel(info_frame, text=titulo.upper(), font=ctk.CTkFont(size=9, weight="bold"), text_color="#3B82F6", anchor="w").pack(fill="x")
        
        if len(valor) > 18: valor = valor[:15] + "..."
        ctk.CTkLabel(info_frame, text=valor, font=ctk.CTkFont(size=12, weight="bold"), text_color="#F8FAFC", anchor="w").pack(fill="x")

    def construir_interface(self):
        # HEADER
        frame_topo = ctk.CTkFrame(self, fg_color="#1E293B", corner_radius=0)
        frame_topo.pack(fill="x", ipady=15)
        ctk.CTkLabel(frame_topo, text="NEXUS AGENT", font=ctk.CTkFont(size=26, weight="bold"), text_color="#F8FAFC").pack(pady=(10, 0))
        ctk.CTkLabel(frame_topo, text=f"TELEMETRIA E CONTROLE v{VERSAO_DESTE_AGENTE}", font=ctk.CTkFont(size=10, weight="bold"), text_color="#3B82F6").pack()

        # TABS (ABAS) 🚀
        self.tabview = ctk.CTkTabview(self, fg_color="transparent")
        self.tabview.pack(fill="both", expand=True, padx=20, pady=10)
        
        tab_diag = self.tabview.add("Diagnóstico")
        tab_logs = self.tabview.add("Terminal de Logs")

        # ================= ABA 1: DIAGNÓSTICO =================
        ctk.CTkLabel(tab_diag, text="Hardware Local", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(5, 5))
        
        self.frame_hardware = ctk.CTkFrame(tab_diag, fg_color="transparent")
        self.frame_hardware.pack(fill="x", pady=(0, 10))
        self.frame_hardware.grid_columnconfigure((0, 1), weight=1)
        
        self.lbl_loading = ctk.CTkLabel(self.frame_hardware, text="Lendo componentes... ⏳", text_color="#3B82F6", font=ctk.CTkFont(size=12, slant="italic"))
        self.lbl_loading.grid(row=0, column=0, columnspan=2, pady=30)

        ctk.CTkLabel(tab_diag, text="Destino de Vinculação", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(10, 5))
        self.combo_sec = ctk.CTkComboBox(tab_diag, values=["Carregando..."], command=self.ao_mudar_secretaria, height=35)
        self.combo_sec.pack(fill="x", pady=(0, 10))

        self.combo_setor = ctk.CTkComboBox(tab_diag, values=["Aguardando secretaria..."], height=35, state="disabled")
        self.combo_setor.pack(fill="x", pady=(0, 15))

        ctk.CTkLabel(tab_diag, text="Patrimônio (Opcional)", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(5, 5))
        self.entry_patrimonio = ctk.CTkEntry(tab_diag, placeholder_text="Deixe em branco para auto-gerar...", height=35)
        self.entry_patrimonio.pack(fill="x", pady=(0, 15))

        self.progress_bar = ctk.CTkProgressBar(tab_diag, height=6, progress_color="#10B981", fg_color="#1E293B")
        self.progress_bar.set(0)
        
        self.btn_coletar = ctk.CTkButton(tab_diag, text="⚡ Enviar para Nuvem", font=ctk.CTkFont(size=14, weight="bold"), height=45, command=self.iniciar_envio, state="disabled")
        self.btn_coletar.pack(fill="x", side="bottom", pady=(5, 10))

        # ================= ABA 2: LOGS DO C2 =================
        self.textbox_logs = ctk.CTkTextbox(tab_logs, fg_color="#181A1B", text_color="#4CAF50", font=ctk.CTkFont(family="Consolas", size=11), wrap="word")
        self.textbox_logs.pack(fill="both", expand=True, pady=5)
        self.textbox_logs.insert("end", "> Console de Eventos Nexus Iniciado.\n> Aguardando instruções remotas...\n\n")
        self.textbox_logs.configure(state="disabled")

    def atualizar_caixa_resumo(self):
        self.lbl_loading.destroy()
        if self.dados_hardware:
            self.criar_card_info(self.frame_hardware, "💻", "Máquina", self.dados_hardware['nome_pc'], 0, 0)
            self.criar_card_info(self.frame_hardware, "⚙️", "Sistema", self.dados_hardware['os'].replace("Microsoft", "").strip(), 0, 1)
            self.criar_card_info(self.frame_hardware, "🧠", "CPU", self.dados_hardware['cpu'].replace("(R)", "").replace("(TM)", ""), 1, 0)
            self.criar_card_info(self.frame_hardware, "💾", "Armaz.", f"{self.dados_hardware['ram']} / {self.dados_hardware['disco']}", 1, 1)
            self.btn_coletar.configure(state="normal") 
            self.escrever_log("✅ Hardware lido com sucesso.")
        else:
            ctk.CTkLabel(self.frame_hardware, text="❌ Falha na leitura WMI.", text_color="#EF4444").grid(row=0, column=0, columnspan=2)

    def carregar_resumo_tela(self):
        self.dados_hardware = ler_hardware_maquina()
        self.after(0, self.atualizar_caixa_resumo)

    def carregar_secretarias(self):
        def fetch():
            try:
                self.escrever_log("🔄 Baixando tabela de secretarias...")
                res = requests.get(f"{self.base_url}/api/unidades/secretarias", timeout=10)
                if res.status_code == 200:
                    self.secretarias_data = res.json()
                    nomes = [s["nome"] for s in self.secretarias_data]
                    self.after(0, lambda: self.combo_sec.configure(values=nomes))
                    if nomes: 
                        self.after(0, lambda: self.combo_sec.set(nomes[0]))
                        self.ao_mudar_secretaria(nomes[0])
                else: 
                    self.after(0, lambda: self.combo_sec.set("Erro no servidor"))
            except Exception as e:
                self.after(0, lambda: self.combo_sec.set("Falha de Conexão"))
                self.escrever_log(f"❌ Erro ao buscar secretarias: {str(e)[:40]}")
        threading.Thread(target=fetch, daemon=True).start()

    def ao_mudar_secretaria(self, nome_sec):
        self.combo_setor.configure(state="normal", values=["Carregando..."]); self.combo_setor.set("Carregando...")
        sec_id = next((s["id"] for s in self.secretarias_data if s["nome"] == nome_sec), None)
        if not sec_id: return
        def fetch_setores():
            try:
                res = requests.get(f"{self.base_url}/api/unidades/secretarias/{sec_id}/setores", timeout=10)
                if res.status_code == 200:
                    self.setores_data = res.json()
                    nomes_setores = [s["nome"] for s in self.setores_data]
                    if nomes_setores: 
                        self.after(0, lambda: self.combo_setor.configure(values=nomes_setores))
                        self.after(0, lambda: self.combo_setor.set(nomes_setores[0]))
                    else: 
                        self.after(0, lambda: self.combo_setor.configure(values=["Nenhum setor"]))
                        self.after(0, lambda: self.combo_setor.set("Nenhum setor"))
            except: 
                self.after(0, lambda: self.combo_setor.set("Erro ao carregar"))
        threading.Thread(target=fetch_setores, daemon=True).start()

    def iniciar_envio(self):
        sec = self.combo_sec.get()
        setor = self.combo_setor.get()
        patrimonio_digitado = self.entry_patrimonio.get().strip()
        
        if not sec or not setor or setor == "Carregando...": return
        if not self.dados_hardware: return 
        
        self.btn_coletar.configure(state="disabled", fg_color="#F59E0B", text_color="#000000")
        self.progress_bar.pack(fill="x", pady=(10, 0), before=self.btn_coletar)
        self.progress_bar.set(0)
        
        self.dados_hardware["secretaria"] = sec
        self.dados_hardware["setor"] = setor
        self.dados_hardware["patrimonio_manual"] = patrimonio_digitado
        self.dados_hardware["override_patrimonio"] = False
        
        def processar_resposta(sucesso, resposta, override_enviado):
            self.progress_bar.set(1.0)
            self.after(500, self.progress_bar.pack_forget)
            self.btn_coletar.configure(state="normal", fg_color=["#3a7ebf", "#1f538d"], text_color=["#DCE4EE", "#DCE4EE"], text="⚡ Enviar para Nuvem")
            
            if sucesso:
                status = resposta.get("status")
                if status == "conflict":
                    if mb.askyesno("Aviso de Duplicidade", resposta.get("message")):
                        threading.Thread(target=run, args=(True,), daemon=True).start()
                elif status == "error":
                    self.popup_moderno("Erro de Cadastro", resposta.get("message"), "#EF4444")
                else:
                    pat = resposta.get('patrimonio')
                    self.escrever_log(f"✅ Sincronizado com sucesso! ID: {pat}")
                    self.popup_moderno("Concluído", f"Registrado na nuvem.\nPatrimônio: {pat}", "#10B981")
                    self.entry_patrimonio.delete(0, 'end') 
            else:
                self.escrever_log("❌ Falha na conexão de envio.")
                self.popup_moderno("Erro de Conexão", f"Falha ao comunicar com a Nuvem:\n{resposta}", "#EF4444")

        def run(override=False):
            self.escrever_log("📦 Enviando inventário para a nuvem...")
            self.after(0, lambda: self.btn_coletar.configure(text="📦 Enviando Dados..."))
            self.after(0, lambda: self.progress_bar.set(0.5))
            time.sleep(0.5)
            
            self.dados_hardware["override_patrimonio"] = override
            sucesso, dados = enviar_para_servidor(self.dados_hardware)
            self.after(0, lambda: processar_resposta(sucesso, dados, override))
            
        threading.Thread(target=run, daemon=True).start()

    # --- OUVINTE C2 INTEGRADO COM A TELA ---
    def escutar_comandos_c2(self):
        self.escrever_log("🎧 Terminal Remoto (C2) ativado.")
        while True:
            try:
                url_check = f"{self.base_url}/api/agente/comandos/pendentes/{self.meu_uuid}"
                res = requests.get(url_check, headers=HEADERS_AUTH, timeout=10)
                
                if res.status_code == 200:
                    dados = res.json()
                    if dados.get("tem_comando"):
                        comando_id = dados.get("comando_id")
                        script_content = dados.get("script_content")
                        
                        self.escrever_log(f"🔥 Comando recebido (ID: {comando_id})")
                        self.escrever_log(f"⚙️ Executando script no background...")
                        
                        try:
                            # 🚀 CORREÇÃO 1: Removida a trava que engolia o ipconfig. Deixamos o Python tratar os erros de codificação (errors="replace").
                            processo = subprocess.run(
                                ["powershell", "-NoProfile", "-Command", script_content],
                                capture_output=True, text=True, errors="replace", 
                                creationflags=subprocess.CREATE_NO_WINDOW
                            )
                            saida = processo.stdout.strip() if processo.stdout else ""
                            erro = processo.stderr.strip() if processo.stderr else ""
                            status_final = "CONCLUIDO" if processo.returncode == 0 else "ERRO"
                            
                            # Junta a saída e os erros
                            log_final = saida
                            if erro:
                                log_final += f"\n[ERROS DO WINDOWS]:\n{erro}"
                                
                            # 🚀 CORREÇÃO 2: Se o comando for executado, mas for vazio, quebra a pegadinha do React
                            if not log_final.strip():
                                log_final = "> Comando executado com sucesso (Sem retorno de texto no terminal)."
                                
                            # Imprime um resumo no log visual do agente
                            resumo = log_final[:40].replace('\n', ' ') + "..." if len(log_final) > 40 else log_final
                            self.escrever_log(f"✅ Retorno: {resumo}")
                            
                        except Exception as e:
                            status_final = "ERRO"
                            log_final = f"Falha fatal ao rodar script: {str(e)}"
                            self.escrever_log(f"❌ Erro crítico: {str(e)}")
                        
                        url_resultado = f"{self.base_url}/api/agente/comandos/resultado"
                        requests.post(url_resultado, json={
                            "comando_id": comando_id, "status": status_final, "output_log": log_final
                        }, headers=HEADERS_AUTH, timeout=15)
                        
                        self.escrever_log("📡 Log devolvido ao servidor.")
            except Exception as e:
                pass
            
            time.sleep(60)

# ==========================================
# CÓDIGO CORE BACKGROUND (SEM TELA)
# ==========================================
def escutar_comandos_silencioso(base_url, uuid_pc):
    """Usado apenas quando o Windows inicia o agente em modo invisível."""
    while True:
        try:
            url_check = f"{base_url}/api/agente/comandos/pendentes/{uuid_pc}"
            res = requests.get(url_check, headers=HEADERS_AUTH, timeout=10)
            
            if res.status_code == 200 and res.json().get("tem_comando"):
                dados = res.json()
                comando_id = dados.get("comando_id")
                script_content = dados.get("script_content")
                
                try:
                    processo = subprocess.run(
                        ["powershell", "-NoProfile", "-Command", script_content],
                        capture_output=True, text=True, errors="replace",
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                    saida = processo.stdout.strip() if processo.stdout else ""
                    erro = processo.stderr.strip() if processo.stderr else ""
                    
                    status_final = "CONCLUIDO" if processo.returncode == 0 else "ERRO"
                    log_final = saida
                    if erro: 
                        log_final += f"\n[ERROS DO WINDOWS]:\n{erro}"
                        
                    if not log_final.strip():
                        log_final = "> Comando executado com sucesso (Sem retorno de texto no terminal)."
                        
                except Exception as e:
                    status_final, log_final = "ERRO", str(e)
                
                requests.post(f"{base_url}/api/agente/comandos/resultado", json={
                    "comando_id": comando_id, "status": status_final, "output_log": log_final
                }, headers=HEADERS_AUTH, timeout=15)
        except: pass
        time.sleep(60)

# ==========================================
# INICIALIZAÇÃO DO AGENTE (A LÓGICA MESTRA)
# ==========================================
if __name__ == "__main__":
    base_url = obter_url_backend()
    meu_uuid = obter_id_persistente()

    # MODO BACKGROUND - INICIADO PELO WATCHDOG (O INVISÍVEL)
    if "--silent" in sys.argv:
        # Liga o C2 em Background puro
        threading.Thread(target=escutar_comandos_silencioso, args=(base_url, meu_uuid), daemon=True).start()
        
        # Loop de Heartbeat e Auto-Update
        while True:
            try:
                # 🚀 AGORA SIM! Ele verifica a atualização. Como o Watchdog roda como SYSTEM, não vai pedir UAC!
                auto_atualizar() 
                
                # Após checar update, faz a coleta normal e manda pra nuvem
                payload_bg = ler_hardware_maquina("Ping Automático", "Background")
                if payload_bg:
                    enviar_para_servidor(payload_bg)
            except: pass
            
            time.sleep(3600) # Dorme por 1 hora e repete o ciclo
            
    # MODO TÉCNICO - INICIADO POR CLIQUE DUPLO (Com Interface)
    else:
        app = NexusAgent(base_url, meu_uuid)
        app.protocol("WM_DELETE_WINDOW", app.ao_fechar_tela)
        app.mainloop()