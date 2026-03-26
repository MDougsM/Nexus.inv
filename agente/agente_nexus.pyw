import shutil
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
# CONFIGURAÇÕES DO AGENTE E ROTEAMENTO MÁGICO
# ==========================================

# 🚀 O LINK DO GIST (Sem o hash no meio para pegar sempre o texto mais recente)
LINK_ROTEADOR = "https://gist.githubusercontent.com/MDougsM/883aefc8a4cb0fe4dc1bc2e8eaf61d6e/raw/nexus_router.txt"

VERSAO_DESTE_AGENTE = "4.6" 

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
#BASE_URL = "http://localhost:8001"
COLETA_URL = f"{BASE_URL}/api/inventario/agente/coleta"
VERSAO_URL = f"{BASE_URL}/api/inventario/agente/versao"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

def auto_atualizar():
    try:
        res = requests.get(VERSAO_URL, timeout=10)
        if res.status_code == 200:
            dados = res.json()
            if dados.get("versao_atual") > VERSAO_DESTE_AGENTE:
                url_download = f"{BASE_URL}{dados.get('url_download')}"
                pasta_temp = tempfile.gettempdir()
                caminho_instalador = os.path.join(pasta_temp, "Nexus_Update.exe")
                resposta_arquivo = requests.get(url_download, stream=True)
                with open(caminho_instalador, 'wb') as f:
                    for chunk in resposta_arquivo.iter_content(chunk_size=8192): f.write(chunk)
                subprocess.Popen([caminho_instalador, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'])
                sys.exit(0) 
    except: pass 

def obter_id_persistente():
    caminho_id = os.path.join(os.environ.get('SystemDrive', 'C:'), '\\Nexus.inv', 'nexus_dna.txt')
    if os.path.exists(caminho_id):
        with open(caminho_id, 'r') as f: return f.read().strip()
    else:
        os.makedirs(os.path.dirname(caminho_id), exist_ok=True)
        import uuid
        novo_id = str(uuid.uuid4())
        with open(caminho_id, 'w') as f: f.write(novo_id)
        try: subprocess.run(['attrib', '+h', caminho_id])
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

        payload = {
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
        return payload
    except Exception as e:
        return None
    

def enviar_para_servidor(payload):
    try:
        res = requests.post(COLETA_URL, json=payload, timeout=15)
        return res.status_code == 200, res.json() if res.status_code == 200 else res.text
    except Exception as e:
        return False, str(e)


def escutar_comandos_c2(base_url, uuid_pc):
    print("🎧 Ouvinte de Comandos Iniciado...")
    while True:
        try:
            url_check = f"{base_url}/api/agente/comandos/pendentes/{uuid_pc}"
            res = requests.get(url_check, timeout=10)
            
            if res.status_code == 200:
                dados = res.json()
                if dados.get("tem_comando"):
                    comando_id = dados.get("comando_id")
                    script_content = dados.get("script_content")
                    
                    print(f"\n🔥 Comando recebido! ID: {comando_id}")
                    print(f"🖥️ Script: {script_content}")
                    
                    try:
                        print("⚙️ Executando no PowerShell...")
                        processo = subprocess.run(
                            ["powershell", "-NoProfile", "-Command", f"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; {script_content}"],
                            capture_output=True,
                            text=True,
                            encoding='utf-8', # Força a leitura perfeita dos acentos
                            creationflags=subprocess.CREATE_NO_WINDOW
                        )
                        saida = processo.stdout if processo.stdout else ""
                        erro = processo.stderr if processo.stderr else ""
                        status_final = "CONCLUIDO" if processo.returncode == 0 else "ERRO"
                        log_final = saida + "\n" + erro
                        print(f"✅ Execução finalizada! Status: {status_final}")
                        
                    except Exception as e:
                        status_final = "ERRO"
                        log_final = f"Falha fatal ao rodar script: {str(e)}"
                        print(f"❌ Erro no Subprocesso: {e}")
                    
                    url_resultado = f"{base_url}/api/agente/comandos/resultado"
                    print("📡 Enviando log para o servidor...")
                    
                    res_post = requests.post(url_resultado, json={
                        "comando_id": comando_id,
                        "status": status_final,
                        "output_log": log_final.strip()
                    }, timeout=15)
                    
                    print(f"🏁 Resposta do Servidor: {res_post.status_code} - {res_post.text}")
                    
        except Exception as e:
            print(f"⚠️ Erro de Conexão no C2: {e}")
            
        time.sleep(60) # Mudamos para 60 segundos para debugar rápido

# ==========================================
# INTERFACE GRÁFICA DO AGENTE (UI PREMIUM)
# ==========================================
class NexusAgent(ctk.CTk):

    def ao_fechar_tela(self):
        """O Agente NUNCA morre. Apenas fecha a cortina visual e vai trabalhar nos bastidores."""
        self.withdraw() # Oculta a janela instantaneamente. O programa NÃO fecha.
        
        # Dispara o loop de heartbeat (ping) em background sem criar processos novos
        threading.Thread(target=self.loop_silencioso, daemon=True).start()

    def loop_silencioso(self):
        """O loop que mantém o Agente vivo enviando dados de hora em hora após a tela fechar"""
        while True:
            try:
                # auto_atualizar() -> COMENTADO TEMPORARIAMENTE NO DEV PARA ELE NÃO SE MATAR
                payload_bg = ler_hardware_maquina("Ping Automático", "Background")
                if payload_bg:
                    enviar_para_servidor(payload_bg)
            except Exception:
                pass
            time.sleep(3600) # Dorme 1 hora

    def __init__(self):
        super().__init__()
        self.title("Nexus.inv - Agente de Coleta")
        self.geometry("440x760")
        self.resizable(False, False)
        self.secretarias_data = []
        self.dados_hardware = None 
        
        self.construir_interface()
        self.carregar_secretarias()
        
        threading.Thread(target=self.carregar_resumo_tela, daemon=True).start()

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
        ctk.CTkButton(pop, text="OK, Entendi", command=pop.destroy, fg_color=cor_destaque, hover_color="#059669").pack(pady=15)

    def criar_card_info(self, pai, icone, titulo, valor, row, col):
        """Cria um mini-card para o grid de hardware"""
        frame = ctk.CTkFrame(pai, fg_color="#18181B", corner_radius=10)
        frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")
        
        ctk.CTkLabel(frame, text=icone, font=ctk.CTkFont(size=20)).pack(side="left", padx=(10, 5), pady=10)
        info_frame = ctk.CTkFrame(frame, fg_color="transparent")
        info_frame.pack(side="left", fill="x", expand=True, padx=(0, 10), pady=5)
        
        ctk.CTkLabel(info_frame, text=titulo.upper(), font=ctk.CTkFont(size=9, weight="bold"), text_color="#3B82F6", anchor="w").pack(fill="x")
        
        # Limita o tamanho do texto para não quebrar o card
        if len(valor) > 18: valor = valor[:15] + "..."
        ctk.CTkLabel(info_frame, text=valor, font=ctk.CTkFont(size=12, weight="bold"), text_color="#F8FAFC", anchor="w").pack(fill="x")

    def construir_interface(self):
        # HEADER
        frame_topo = ctk.CTkFrame(self, fg_color="#1E293B", corner_radius=0)
        frame_topo.pack(fill="x", ipady=15)
        ctk.CTkLabel(frame_topo, text="NEXUS.INV", font=ctk.CTkFont(size=26, weight="bold"), text_color="#F8FAFC").pack(pady=(10, 0))
        ctk.CTkLabel(frame_topo, text="AGENTE DE COLETA & TELEMETRIA", font=ctk.CTkFont(size=10, weight="bold"), text_color="#3B82F6").pack()

        frame_corpo = ctk.CTkFrame(self, fg_color="transparent")
        frame_corpo.pack(fill="both", expand=True, padx=25, pady=10)

        # 🚀 NOVO PAINEL DE CARDS (Substitui a caixa de texto)
        ctk.CTkLabel(frame_corpo, text="Diagnóstico do Sistema", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(5, 5))
        
        self.frame_hardware = ctk.CTkFrame(frame_corpo, fg_color="transparent")
        self.frame_hardware.pack(fill="x", pady=(0, 10))
        self.frame_hardware.grid_columnconfigure((0, 1), weight=1)
        
        # Estado de carregamento inicial
        self.lbl_loading = ctk.CTkLabel(self.frame_hardware, text="Lendo componentes... ⏳", text_color="#3B82F6", font=ctk.CTkFont(size=12, slant="italic"))
        self.lbl_loading.grid(row=0, column=0, columnspan=2, pady=30)

        # DESTINO
        ctk.CTkLabel(frame_corpo, text="Destino de Vinculação", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(15, 5))
        
        self.combo_sec = ctk.CTkComboBox(frame_corpo, values=["Carregando..."], command=self.ao_mudar_secretaria, height=35)
        self.combo_sec.pack(fill="x", pady=(0, 10))

        self.combo_setor = ctk.CTkComboBox(frame_corpo, values=["Aguardando secretaria..."], height=35, state="disabled")
        self.combo_setor.pack(fill="x", pady=(0, 15))

        # PATRIMÔNIO
        ctk.CTkLabel(frame_corpo, text="Patrimônio (Opcional)", font=ctk.CTkFont(size=13, weight="bold"), text_color="#94A3B8").pack(anchor="w", pady=(5, 5))
        self.entry_patrimonio = ctk.CTkEntry(frame_corpo, placeholder_text="Deixe em branco para auto-gerar...", height=35)
        self.entry_patrimonio.pack(fill="x", pady=(0, 20))

        # 🚀 EFEITO MANEIRO: BARRA DE PROGRESSO OCULTA
        self.progress_bar = ctk.CTkProgressBar(frame_corpo, height=6, progress_color="#10B981", fg_color="#1E293B")
        self.progress_bar.set(0)
        
        self.btn_coletar = ctk.CTkButton(frame_corpo, text="⚡ Sincronizar com Servidor", font=ctk.CTkFont(size=14, weight="bold"), height=45, command=self.iniciar_envio, state="disabled")
        self.btn_coletar.pack(fill="x", pady=(5, 0))

    def atualizar_caixa_resumo(self):
        # Remove o "Lendo componentes..."
        self.lbl_loading.destroy()
        
        if self.dados_hardware:
            # Desenha o Grid de Cards Dinâmico
            self.criar_card_info(self.frame_hardware, "💻", "Máquina", self.dados_hardware['nome_pc'], 0, 0)
            self.criar_card_info(self.frame_hardware, "⚙️", "Sistema", self.dados_hardware['os'].replace("Microsoft", "").strip(), 0, 1)
            self.criar_card_info(self.frame_hardware, "🧠", "Processador", self.dados_hardware['cpu'].replace("(R)", "").replace("(TM)", ""), 1, 0)
            self.criar_card_info(self.frame_hardware, "💾", "RAM & Disco", f"{self.dados_hardware['ram']} / {self.dados_hardware['disco']}", 1, 1)
            self.criar_card_info(self.frame_hardware, "🌐", "Rede (IP)", self.dados_hardware['ip'], 2, 0)
            self.criar_card_info(self.frame_hardware, "🏷️", "Serial", self.dados_hardware['serial'], 2, 1)
            
            self.btn_coletar.configure(state="normal") 
        else:
            ctk.CTkLabel(self.frame_hardware, text="❌ Falha na leitura WMI.\nAbra como Administrador.", text_color="#EF4444").grid(row=0, column=0, columnspan=2)

    def carregar_resumo_tela(self):
        self.dados_hardware = ler_hardware_maquina()
        self.after(0, self.atualizar_caixa_resumo)

    def carregar_secretarias(self):
        def fetch():
            try:
                res = requests.get(f"{BASE_URL}/api/unidades/secretarias", timeout=10)
                if res.status_code == 200:
                    self.secretarias_data = res.json()
                    nomes = [s["nome"] for s in self.secretarias_data]
                    self.combo_sec.configure(values=nomes)
                    if nomes: self.combo_sec.set(nomes[0]); self.ao_mudar_secretaria(nomes[0])
                else: self.combo_sec.set("Erro no servidor")
            except:
                self.combo_sec.set("Falha de Conexão")
        threading.Thread(target=fetch, daemon=True).start()

    def ao_mudar_secretaria(self, nome_sec):
        self.combo_setor.configure(state="normal", values=["Carregando..."]); self.combo_setor.set("Carregando...")
        sec_id = next((s["id"] for s in self.secretarias_data if s["nome"] == nome_sec), None)
        if not sec_id: return
        def fetch_setores():
            try:
                res = requests.get(f"{BASE_URL}/api/unidades/secretarias/{sec_id}/setores", timeout=10)
                if res.status_code == 200:
                    self.setores_data = res.json()
                    nomes_setores = [s["nome"] for s in self.setores_data]
                    if nomes_setores: self.combo_setor.configure(values=nomes_setores); self.combo_setor.set(nomes_setores[0])
                    else: self.combo_setor.configure(values=["Nenhum setor"]); self.combo_setor.set("Nenhum setor")
            except: self.combo_setor.set("Erro ao carregar")
        threading.Thread(target=fetch_setores, daemon=True).start()

    def iniciar_envio(self):
        sec = self.combo_sec.get()
        setor = self.combo_setor.get()
        patrimonio_digitado = self.entry_patrimonio.get().strip()
        
        if not sec or not setor or setor == "Carregando...": return
        if not self.dados_hardware: return 
        
        # Desabilita o botão e mostra a barra de progresso
        self.btn_coletar.configure(state="disabled", fg_color="#F59E0B", text_color="#000000")
        self.progress_bar.pack(fill="x", pady=(10, 0), before=self.btn_coletar)
        self.progress_bar.set(0)
        
        self.dados_hardware["secretaria"] = sec
        self.dados_hardware["setor"] = setor
        self.dados_hardware["patrimonio_manual"] = patrimonio_digitado
        self.dados_hardware["override_patrimonio"] = False
        
        def processar_resposta(sucesso, resposta, override_enviado):
            self.progress_bar.set(1.0)
            self.after(500, self.progress_bar.pack_forget) # Esconde a barra depois de meio segundo
            
            # Reseta o botão para o visual original
            self.btn_coletar.configure(state="normal", fg_color=["#3a7ebf", "#1f538d"], text_color=["#DCE4EE", "#DCE4EE"], text="⚡ Sincronizar com Servidor")
            
            if sucesso:
                status = resposta.get("status")
                if status == "conflict":
                    if mb.askyesno("Aviso de Duplicidade", resposta.get("message")):
                        threading.Thread(target=run, args=(True,), daemon=True).start()
                elif status == "error":
                    self.popup_moderno("Erro de Cadastro", resposta.get("message"), "#EF4444")
                else:
                    self.popup_moderno("Sincronização Concluída", f"O equipamento foi registrado na nuvem.\n\nPatrimônio Gerado: {resposta.get('patrimonio')}", "#10B981")
                    self.entry_patrimonio.delete(0, 'end') 
            else:
                self.popup_moderno("Erro de Conexão", f"Falha ao comunicar com a Nuvem:\n{resposta}", "#EF4444")

        def run(override=False):
            # EFEITO DE ANIMAÇÃO DA TELA (Executa em background)
            self.after(0, lambda: self.btn_coletar.configure(text="📦 Empacotando Hardware..."))
            self.after(0, lambda: self.progress_bar.set(0.2))
            time.sleep(0.4)
            
            self.after(0, lambda: self.btn_coletar.configure(text="🔒 Autenticando na Nuvem..."))
            self.after(0, lambda: self.progress_bar.set(0.5))
            time.sleep(0.4)
            
            self.after(0, lambda: self.btn_coletar.configure(text="🚀 Transmitindo Dados..."))
            self.after(0, lambda: self.progress_bar.set(0.8))
            
            # Executa a chamada HTTP real
            self.dados_hardware["override_patrimonio"] = override
            sucesso, dados = enviar_para_servidor(self.dados_hardware)
            
            # Finaliza
            self.after(0, lambda: processar_resposta(sucesso, dados, override))
            
        threading.Thread(target=run, daemon=True).start()

# ==========================================
# MODO BACKGROUND (HEARTBEAT - 1 HORA)
# ==========================================
if len(sys.argv) > 1 and sys.argv[1] == "--silent":
    # 🚀 LIGA O OUVINTE DE C2 EM BACKGROUND
    meu_uuid = obter_id_persistente()
    threading.Thread(target=escutar_comandos_c2, args=(BASE_URL, meu_uuid), daemon=True).start()
    
    while True:
        auto_atualizar()
        payload_bg = ler_hardware_maquina("Ping Automático", "Background")
        if payload_bg:
            enviar_para_servidor(payload_bg)
        time.sleep(3600)

# ==========================================
# INICIALIZAÇÃO DO AGENTE (A LÓGICA MESTRA)
# ==========================================
if __name__ == "__main__":
    # 1. Carrega as configurações vitais
    base_url = obter_url_backend()
    meu_uuid = obter_id_persistente()

    # 2. O C2 SEMPRE INICIA (Independente de ter tela ou não)
    threading.Thread(target=escutar_comandos_c2, args=(base_url, meu_uuid), daemon=True).start()

    # 3. Decide qual modo abrir
    if "--silent" in sys.argv:
        # =========================================================
        # MODO INICIADO PELO WINDOWS AO LIGAR O PC (Sem tela)
        # =========================================================
        while True:
            try:
                # auto_atualizar() -> COMENTADO NO DEV
                payload_bg = ler_hardware_maquina("Ping Automático", "Background")
                if payload_bg:
                    enviar_para_servidor(payload_bg)
            except Exception:
                pass
            time.sleep(3600)
    else:
        # =========================================================
        # MODO TÉCNICO (2 cliques no .exe na instalação)
        # =========================================================
        app = NexusAgent()
        
        # Intercepta o botão "X" para não matar o programa, apenas esconder
        app.protocol("WM_DELETE_WINDOW", app.ao_fechar_tela)
        
        # Mantém o programa vivo para sempre
        app.mainloop()