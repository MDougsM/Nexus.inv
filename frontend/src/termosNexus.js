// src/termosNexus.js

export const TERMOS_NEXUS = {
    titulo: "Termo de Responsabilidade e Uso Ético - Sistema Nexus",
    subtitulo: "Conformidade com a Lei Geral de Proteção de Dados (LGPD) e Estatuto do Servidor",
    corpo: [
        {
            topico: "1. ESCOPO E FINALIDADE ADMINISTRATIVA",
            texto: "O Agente Nexus é uma ferramenta de uso exclusivo da Secretaria de TI/Infraestrutura. Sua finalidade é estritamente vinculada ao suporte técnico, inventário patrimonial e manutenção preventiva/corretiva do parque tecnológico municipal. O uso para fins alheios ao interesse público é vedado."
        },
        {
            topico: "2. CONFORMIDADE COM A LGPD (LEI 13.709/2018)",
            texto: "O operador reconhece que o sistema coleta metadados de hardware, software e rede. Princípio da Necessidade: A coleta restringe-se a dados técnicos essenciais. Vedações Estritas: É terminantemente proibida a extração de arquivos pessoais, monitoramento de navegação privada, captura de telas (screenshots) ou logs de digitação (keylogging) sem autorização judicial ou administrativa formal."
        },
        {
            topico: "3. USO DO TERMINAL REMOTO E COMANDOS C2",
            texto: "Ao utilizar as funções de Terminal Remoto (C2), o operador declara ciência de que a execução de scripts e comandos ocorre com privilégios de SYSTEM/ADMINISTRADOR. Qualquer dano causado ao sistema operacional ou perda de dados por comandos mal formulados é de inteira responsabilidade do operador identificado."
        },
        {
            topico: "4. MONITORAMENTO E IMUTABILIDADE DE LOGS",
            texto: "O operador declara estar ciente de que o sistema utiliza tecnologia de rastreabilidade total. Todas as interações (logins, comandos enviados, relatórios gerados e alterações de ativos) são registradas em logs auditáveis, associadas ao ID do Operador, Endereço IP e Geolocalização Técnica. Estes registros são imutáveis e servirão como prova em processos administrativos."
        },
        {
            topico: "5. SANÇÕES E RESPONSABILIZAÇÃO LEGAL",
            texto: "A quebra de sigilo, o acesso indevido a informações privilegiadas ou o uso da ferramenta para assédio ou monitoramento ilícito sujeitará o infrator às sanções disciplinares previstas no Estatuto do Servidor e à responsabilização nas esferas Civil (reparação de danos) e Penal (Lei de Crimes Cibernéticos 12.737/12)."
        }
    ],
    notaAlerta: "⚠️ IMPORTANTE: Ao clicar em 'CONCORDO', você gera uma assinatura digital vinculada ao seu usuário. Todas as suas ações a partir de agora serão rastreadas e auditadas para segurança jurídica da municipalidade."
};