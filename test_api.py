#!/usr/bin/env python
import requests
import json

# Testar os dois endpoints
base_url = "http://localhost:8001"
headers = {
    "x-empresa": "NEWPC"
}

print("🧪 Testando endpoints do backend:\n")

# Teste 1: Máquina 14240 (que funciona)
print("1️⃣ Testando 14240 (que funciona):")
try:
    url = f"{base_url}/api/inventario/ficha/detalhes/14240"
    response = requests.get(url, headers=headers)
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✅ Sucesso! Patrimônio: {data['ativo']['patrimonio']}")
    else:
        print(f"  ❌ Erro: {response.text[:200]}")
except Exception as e:
    print(f"  ❌ Erro de conexão: {e}")

# Teste 2: Máquina 00131 (que não funciona)
print("\n2️⃣ Testando 00131 (que não funciona):")
try:
    url = f"{base_url}/api/inventario/ficha/detalhes/00131"
    response = requests.get(url, headers=headers)
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✅ Sucesso! Patrimônio: {data['ativo']['patrimonio']}")
    else:
        print(f"  ❌ Erro: {response.text[:200]}")
except Exception as e:
    print(f"  ❌ Erro de conexão: {e}")

# Teste 3: Com URL encoding
print("\n3️⃣ Testando 00131 com URL encoding:")
try:
    from urllib.parse import quote
    encoded = quote("00131", safe='')
    url = f"{base_url}/api/inventario/ficha/detalhes/{encoded}"
    response = requests.get(url, headers=headers)
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✅ Sucesso! Patrimônio: {data['ativo']['patrimonio']}")
    else:
        print(f"  ❌ Erro: {response.text[:200]}")
except Exception as e:
    print(f"  ❌ Erro: {e}")
