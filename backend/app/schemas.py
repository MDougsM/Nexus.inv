from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    usuario: str
    senha: str

class AtivoBase(BaseModel):
    patrimonio: str
    equipamento: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    secretaria: Optional[str] = None
    setor: Optional[str] = None
    tecnico: Optional[str] = None
    processador: Optional[str] = None
    memoria: Optional[str] = None

class AtivoResponse(BaseModel):
    id: int
    tecnico: str
    setor: str
    equipamento: str
    patrimonio: str
    class Config:
        from_attributes = True

class ExclusaoRequest(BaseModel):
    motivo: str
    usuario: str

class AgenteColeta(BaseModel):
    uuid_persistente: Optional[str] = None
    tipo: str
    marca: str
    modelo: str
    cpu: str
    ram: str
    os: str
    disco: str
    tipo_disco: str
    nome_pc: str
    usuario_pc: str
    serial: str
    mac: str
    ip: str
    secretaria: str
    setor: str
    patrimonio_manual: Optional[str] = ""
    override_patrimonio: Optional[bool] = False

# ==========================================
# SCHEMAS DO TERMINAL REMOTO (C2)
# ==========================================
class ComandoCreate(BaseModel):
    patrimonio: str
    uuid_persistente: str
    script_content: str
    usuario_emissor: str
    # 🚀 NOVOS CAMPOS DA BLINDAGEM RSA
    chave_privada_pem: str
    senha_chave: str

class ComandoResultado(BaseModel):
    comando_id: int
    status: str
    output_log: str