import os
import socket
import subprocess
import threading
import concurrent.futures
import wmi
import requests
import customtkinter as ctk
from tkinter import messagebox

# ==========================================
# CONFIGURAÇÕES DO APLICATIVO E API
# ==========================================
ctk.set_appearance_mode("dark")  # Modo escuro
ctk.set_default_color_theme("blue")  # Tema azul (estilo Nexus)

API_URL = "https://wan-involves-elements-std.trycloudflare.com/api/inventario/agente/coleta/massa"

class NexusDiscoveryApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Nexus Discovery Pro - Network Scanner")
        self.geometry("900x600")
        self.resizable(False, False)

        self.rede_base = self.obter_rede_local()
        self.maquinas_encontradas = []
        self.checkboxes = []

        self.construir_interface()

    def obter_rede_local(self):
        """Descobre automaticamente em qual rede o PC está conectado"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            meu_ip = s.getsockname()[0]
            s.close()
            # Retorna os 3 primeiros blocos (Ex: 192.168.0.)
            return ".".join(meu_ip.split(".")[:3]) + "."
        except:
            return "192.168.0."

    def construir_interface(self):
        # --- TOPO (CABEÇALHO) ---
        self.frame_topo = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_topo.pack(pady=20, padx=20, fill="x")

        self.lbl_titulo = ctk.CTkLabel(self.frame_topo, text="NEXUS DISCOVERY PRO", font=ctk.CTkFont(size=24, weight="bold"))
        self.lbl_titulo.pack(side="left")

        self.lbl_rede = ctk.CTkLabel(self.frame_topo, text=f"Rede Detectada: {self.rede_base}X", text_color="gray")
        self.lbl_rede.pack(side="left", padx=20)

        self.btn_escanear = ctk.CTkButton(self.frame_topo, text="▶ Iniciar Varredura", font=ctk.CTkFont(weight="bold"), command=self.iniciar_scan_thread)
        self.btn_escanear.pack(side="right")

        # --- MEIO (LISTA DE MÁQUINAS) ---
        self.frame_lista = ctk.CTkScrollableFrame(self, label_text="Dispositivos Encontrados (Selecione para importar)")
        self.frame_lista.pack(pady=10, padx=20, fill="both", expand=True)

        # --- RODAPÉ (AÇÕES) ---
        self.frame_rodape = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_rodape.pack(pady=20, padx=20, fill="x")

        self.lbl_status = ctk.CTkLabel(self.frame_rodape, text="Aguardando comando...", text_color="gray")
        self.lbl_status.pack(side="left")

        self.btn_enviar = ctk.CTkButton(self.frame_rodape, text="☁️ Enviar Selecionados para o Nexus", fg_color="#10B981", hover_color="#059669", font=ctk.CTkFont(weight="bold"), command=self.enviar_para_nuvem, state="disabled")
        self.btn_enviar.pack(side="right")

    # ==========================================
    # MOTORES DE VARREDURA (BACKEND)
    # ==========================================
    def host_ativo(self, ip):
        """Verifica se o IP está vivo testando o Ping ou a porta 135 (WMI) do Windows"""
        # 1. Tenta Ping Rápido
        res = subprocess.run(f"ping -n 1 -w 300 {ip}", stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
        if "TTL=" in res.stdout:
            return True
        
        # 2. Drible do Firewall: Tenta bater na porta 135 (RPC/WMI) do Windows
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                s.connect((ip, 135))
            return True
        except:
            return False

    def invasao_wmi(self, ip):
        """Extrai os dados de hardware via rede"""
        dados_wmi = {"cpu": "", "ram": "", "os": "", "usuario_pc": "", "serial": "Não identificado", "marca": "Desconhecida", "modelo": "Desconhecido", "disco": "", "tipo_disco": "HD"}
        try:
            conexao = wmi.WMI(ip)
            sistema = conexao.Win32_ComputerSystem()[0]
            bios = conexao.Win32_BIOS()[0]
            cpu = conexao.Win32_Processor()[0]
            
            dados_wmi["marca"] = sistema.Manufacturer.strip()
            dados_wmi["modelo"] = sistema.Model.strip()
            dados_wmi["usuario_pc"] = sistema.UserName if sistema.UserName else "Sem usuário"
            dados_wmi["serial"] = bios.SerialNumber.strip()
            dados_wmi["cpu"] = cpu.Name.strip()
            dados_wmi["ram"] = f"{round(int(sistema.TotalPhysicalMemory) / (1024**3))} GB"
        except:
            pass # Acesso negado ou não é Windows
        return dados_wmi

    def escanear_ip(self, ip):
        if self.host_ativo(ip):
            try:
                nome, _, _ = socket.gethostbyaddr(ip)
                hostname = nome.split('.')[0]
            except:
                hostname = "Desconhecido"
            
            hardware = self.invasao_wmi(ip)
            
            maq = {"ip": ip, "nome_pc": hostname, "mac": "Via Rede", **hardware}
            self.maquinas_encontradas.append(maq)
            
            # Atualiza a interface (precisa ser via after por causa da Thread)
            self.after(0, self.adicionar_item_lista, maq)

    # ==========================================
    # CONTROLES DA INTERFACE
    # ==========================================
    def iniciar_scan_thread(self):
        self.btn_escanear.configure(state="disabled", text="⏳ Escaneando...")
        self.btn_enviar.configure(state="disabled")
        self.lbl_status.configure(text="Varrendo a rede em busca de equipamentos...", text_color="#3B82F6")
        
        # Limpa a lista anterior
        for widget in self.frame_lista.winfo_children():
            widget.destroy()
        self.maquinas_encontradas.clear()
        self.checkboxes.clear()

        # Roda o scan em segundo plano para não congelar a tela
        threading.Thread(target=self.executar_scan, daemon=True).start()

    def executar_scan(self):
        ips = [f"{self.rede_base}{i}" for i in range(1, 255)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            executor.map(self.escanear_ip, ips)
        
        # Finaliza
        self.after(0, self.finalizar_scan)

    def adicionar_item_lista(self, maq):
        texto = f"{maq['ip']}  |  {maq['nome_pc'].ljust(20)} "
        if maq['serial'] != "Não identificado":
            texto += f" | ✅ Hardware Extraído (S/N: {maq['serial']} - RAM: {maq['ram']})"
            cor = "#10B981" # Verde
        else:
            texto += " | 🔒 Acesso Protegido/Superficial"
            cor = "gray"

        chk = ctk.CTkCheckBox(self.frame_lista, text=texto, text_color=cor, font=ctk.CTkFont(weight="bold"))
        chk.pack(pady=5, padx=10, anchor="w")
        chk.select() # Já vem marcado por padrão
        
        self.checkboxes.append({"widget": chk, "dados": maq})

    def finalizar_scan(self):
        self.btn_escanear.configure(state="normal", text="▶ Refazer Varredura")
        if self.maquinas_encontradas:
            self.lbl_status.configure(text=f"Scan concluído! {len(self.maquinas_encontradas)} equipamentos encontrados.", text_color="#10B981")
            self.btn_enviar.configure(state="normal")
        else:
            self.lbl_status.configure(text="Nenhum equipamento encontrado.", text_color="#EF4444")

    def enviar_para_nuvem(self):
        selecionadas = [item["dados"] for item in self.checkboxes if item["widget"].get() == 1]
        
        if not selecionadas:
            messagebox.showwarning("Atenção", "Nenhuma máquina selecionada para envio!")
            return

        self.lbl_status.configure(text="Enviando para o Nexus...", text_color="#F59E0B")
        self.btn_enviar.configure(state="disabled")
        
        try:
            payload = {"maquinas": selecionadas, "usuario_acao": "Nexus Discovery App"}
            res = requests.post(API_URL, json=payload, timeout=10)
            
            if res.status_code == 200:
                messagebox.showinfo("Sucesso", res.json().get("message", "Máquinas importadas com sucesso!"))
                self.lbl_status.configure(text="Importação concluída com sucesso!", text_color="#10B981")
            else:
                messagebox.showerror("Erro do Servidor", res.text)
                self.lbl_status.configure(text="Erro ao conectar com a API.", text_color="#EF4444")
        except Exception as e:
            messagebox.showerror("Erro Crítico", f"Falha na conexão: {e}")
            self.lbl_status.configure(text="Erro de rede.", text_color="#EF4444")
        finally:
            self.btn_enviar.configure(state="normal")

if __name__ == "__main__":
    app = NexusDiscoveryApp()
    app.mainloop()