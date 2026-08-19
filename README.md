# Monte Sião Microcrédito

# PRD — Zion

## Documento de Requisitos de Produto

**Versão:** 1.0

**Data:** Agosto de 2026

**Status:** Rascunho para validação

---

## 1. Visão Geral

**Zion** é uma plataforma fintech de microcrédito digital, focada exclusivamente no bairro **Monte Sião**, em Manaus (AM). O objetivo é oferecer empréstimos de pequeno valor a moradores e pequenos comerciantes locais, com juros de **2% ao mês**, usando um capital inicial de **£1.000** (aproximadamente R$ 6.900, cotação de referência — o valor real deve ser confirmado no lançamento).

O modelo é hiperlocal por design: a operação começa pequena, testando risco de crédito e cobrança em uma comunidade delimitada, antes de qualquer expansão.

---

## 2. Problema a Resolver

- Moradores e microempreendedores do Monte Sião têm acesso limitado a crédito formal (bancos tradicionais exigem garantias, histórico bancário e valores mínimos incompatíveis com a necessidade local).

- Alternativas informais (agiotagem) costumam cobrar juros muito acima de 2% a.m. e sem transparência.

- Falta um canal digital simples, confiável e com juros claros para pequenas necessidades de caixa (capital de giro, emergências, compras pontuais).

---

## 3. Objetivos do Produto

| Objetivo | Métrica de sucesso |

|---|---|

| Validar modelo de microcrédito hiperlocal | Carteira de empréstimos ativa e saudável (inadimplência controlada) |

| Preservar e girar o capital inicial | Capital de giro (£1.000) mantido positivo após 6 meses |

| Criar confiança na comunidade | Nº de clientes recorrentes / indicações |

| Operação simples e sustentável | Custo operacional baixo (equipe enxuta, processos digitais) |

---

## 4. Público-Alvo

- Moradores maiores de 18 anos, residentes comprovadamente no bairro Monte Sião, Manaus/AM.

- Perfil: informalidade de renda, pequenos comerciantes, autônomos, famílias que precisam de crédito rápido e de baixo valor.

- Fora de escopo (v1): qualquer solicitante fora do raio geográfico definido.

---

## 5. Restrições Fundamentais do Negócio

Estas restrições **moldam todo o produto** e devem ser refletidas em regras de sistema, não apenas em políticas escritas:

1. **Capital inicial fixo:** £1.000. Isso limita drasticamente o número de empréstimos simultâneos possíveis — o produto precisa de um **motor de alocação de capital** que controle quanto está disponível para novos empréstimos a qualquer momento.

2. **Taxa de juros fixa:** 2% ao mês (sem variação por perfil de risco, ao menos na v1).

3. **Restrição geográfica rígida:** apenas solicitantes do bairro Monte Sião, Manaus/AM. Precisa de verificação de endereço/geolocalização no onboarding.

4. **Moeda:** definir desde já se a operação será em GBP (capital de origem) ou convertida e operada em BRL (moeda do tomador). Recomendação: operar e contabilizar em BRL localmente, com o capital em GBP convertido no aporte inicial — evita expor os tomadores a risco cambial.

⚠️ **Ponto de atenção que precisa validação fora deste PRD:** operações de crédito no Brasil são reguladas pelo Banco Central (resoluções sobre SCD/SEP, CCB, cobrança de juros, LGPD para dados de solicitantes). Antes do lançamento, é necessário confirmar o enquadramento legal adequado (ex.: correspondente bancário, parceria com instituição licenciada, ou associação/cooperativa de crédito local) — isso pode mudar significativamente a arquitetura do produto.

---

## 6. Escopo da v1 (MVP)

### 6.1 Funcionalidades essenciais

**Para o solicitante (tomador):**

- Cadastro com verificação de identidade (documento + selfie)

- Verificação de endereço no Monte Sião (CEP, comprovante de residência, geolocalização no cadastro)

- Simulação de empréstimo (valor, prazo, parcelas, total com juros de 2% a.m.)

- Solicitação de crédito com valor máximo definido por política interna (ex.: teto por cliente, ajustável)

- Acompanhamento do saldo devedor e datas de vencimento

- Pagamento via Pix (essencial para o contexto brasileiro)

- Histórico de empréstimos e pagamentos

**Para a operação (admin/backoffice):**

- Painel de aprovação/reprovação de solicitações

- Painel de controle do capital disponível vs. capital emprestado (crítico dado o teto de £1.000)

- Gestão de inadimplência (régua de cobrança, lembretes automáticos)

- Relatórios financeiros básicos (carteira ativa, inadimplência, juros recebidos)

- Cadastro e validação manual de moradores do bairro (na v1, pode ser semi-manual)

### 6.2 Fora de escopo na v1

- Expansão para outros bairros/cidades

- Múltiplas taxas de juros por perfil de risco (score de crédito)

- App mobile nativo (web responsivo é suficiente no início)

- Produtos além do microcrédito (conta digital completa, cartão, etc.)

---

## 7. Regras de Negócio Críticas

1. **Motor de capital disponível:** o sistema nunca pode aprovar um empréstimo que exceda o capital livre (capital total − empréstimos ativos + recebimentos já quitados).

2. **Cálculo de juros:** 2% ao mês, simples ou composto — **decisão a definir**, pois muda o valor total devido e precisa estar claro no contrato/tela de simulação.

3. **Valor mínimo e máximo por empréstimo:** a definir (sugestão inicial: entre R$ 100 e R$ 1.000, dado o capital total limitado).

4. **Elegibilidade:** apenas CPF com comprovante de residência no Monte Sião.

5. **Inadimplência:** definir régua (ex.: lembrete 3 dias antes, no vencimento, +7 dias, +15 dias) e política de negativação/cobrança.

---

## 8. Requisitos Não Funcionais

- **Segurança:** dados sensíveis (CPF, comprovantes, dados bancários) protegidos conforme LGPD.

- **Confiabilidade de pagamento:** integração via Pix com conciliação automática.

- **Auditabilidade:** todo empréstimo, aprovação e pagamento deve ter trilha de auditoria (quem aprovou, quando, com base em quê).

- **Simplicidade:** interface pensada para usuários com baixa familiaridade digital (linguagem simples, poucos passos).

---

## 9. Riscos

| Risco | Impacto | Mitigação |

|---|---|---|

| Capital muito baixo (£1.000) limita escala e resiliência a inadimplência | Alto | Definir teto de exposição por cliente; começar com poucos empréstimos-piloto |

| Enquadramento regulatório incerto | Alto | Validar com jurídico especializado em crédito antes do lançamento |

| Verificação de endereço fraudada | Médio | Validação manual na v1 + visita/contato local quando necessário |

| Inadimplência concentrada em bairro único | Alto | Política de crédito conservadora; valores baixos no início |

| Câmbio GBP→BRL na entrada de capital | Baixo/Médio | Converter uma única vez no aporte, operar 100% em BRL depois |

---

## 10. Métricas de Sucesso (v1)

- Nº de empréstimos concedidos no primeiro trimestre

- Taxa de inadimplência (%)

- Capital girado / capital original (velocidade de reciclagem do capital)

- Satisfação dos clientes (NPS simples)

- Tempo médio de aprovação

---

## 11. Próximos Passos Sugeridos

1. Validar enquadramento legal/regulatório da operação de crédito no Brasil.

2. Definir política de crédito detalhada (valores mín/máx, prazos, régua de cobrança).

3. Prototipar telas do fluxo de solicitação e simulação de empréstimo.

4. Definir stack técnica e integração de pagamento (Pix).

5. Rodar piloto com número reduzido de clientes no Monte Sião antes de abrir para o bairro todo.

---

*Este PRD é um ponto de partida estratégico. Os itens marcados com ⚠️ precisam de validação jurídica/financeira antes da execução.*

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zion-solutions.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fffa6200-4b65-4a70-84d8-6ee94a9ec433).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
