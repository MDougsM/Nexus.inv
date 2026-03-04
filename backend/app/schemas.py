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