# Publicação de nova versão no GitHub

Siga estes passos ao subir uma nova versão do Nexus.inv:

1. Adiciona os arquivos modificados à fila de envio:
   ```bash
git add .
```
2. Cria o commit com uma mensagem clara:
   ```bash
git commit -m "Sua versão atual: Descrição breve"
```
3. Cria a nova tag de versão:
   ```bash
git tag v{nova versão}
```
4. Envia o código atualizado para o repositório principal:
   ```bash
git push origin main
```
5. Envia a nova tag para a nuvem:
   ```bash
git push origin v{nova versão}
```

> Substitua `{nova versão}` por `6.0.1`, `6.1.0` ou outro valor compatível com o versionamento do projeto.
