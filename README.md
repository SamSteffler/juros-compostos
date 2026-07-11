# Calculadora de Juros Compostos

Este é um projeto pessoal desenvolvido como alternativa aos aplicativos de juros compostos existentes nas lojas virtuais, que frequentemente exibem anúncios excessivos e exigem conexão à internet para tarefas básicas. 

O objetivo principal é oferecer uma ferramenta simples, direta e eficiente, capaz de funcionar totalmente offline em qualquer dispositivo com um navegador moderno por meio da tecnologia Progressive Web App (PWA).

## Funcionalidades

A aplicação conta com recursos de cálculo financeiro e integração de taxas, divididos em:

- **Cálculo de Juros Compostos**: Simulação de evolução patrimonial com opção de aportes periódicos.
- **Cálculo de Juros Simples**: Ferramenta complementar para simulações de rendimentos lineares.
- **Flexibilidade de Prazos**: Suporte a diferentes frequências de capitalização e depósitos (mensal, anual, semestral, etc.).
- **Tributação**: Simulação de desconto de impostos sobre os rendimentos (incluindo cálculo automático baseado na tabela regressiva de renda fixa do Brasil).
- **Indexadores de Mercado**: Integração direta com as taxas SELIC, CDI e IPCA do Banco Central do Brasil para simulações com ativos reais.
- **Planejamento Financeiro**: Calculadoras específicas para descobrir o tempo necessário ou a taxa de juros exigida para atingir uma meta financeira preestabelecida.
- **Relatórios exportáveis**: Geração de um documento em PDF com o resumo da simulação, incluindo gráficos e resultados finais.

## Funcionamento Offline e Integração com API

Para garantir a melhor precisão, o aplicativo tenta se conectar à API do Banco Central do Brasil (BCB) na inicialização para obter as taxas atuais do mercado:

- **Em conexões ativas**: As taxas SELIC, CDI e IPCA são atualizadas e salvas no `LocalStorage`.
- **Em conexões offline**: O aplicativo recorre ao cache local das últimas taxas obtidas via `LocalStorage`. Se não houver dados salvos previamente, valores de segurança (fallbacks) são utilizados.

O aplicativo utiliza um Service Worker para salvar os arquivos essenciais (HTML, CSS, JS e bibliotecas externas como Chart.js) em cache, garantindo o funcionamento completo da interface e dos gráficos mesmo sem sinal de internet.

## Instalação como Aplicativo (PWA)

Por ser um Progressive Web App, esta calculadora pode ser instalada diretamente no seu dispositivo sem passar por lojas de aplicativos:

### Dispositivos Móveis (Android e iOS)
- No **Chrome ou Edge** para Android: toque no aviso de instalação na barra do navegador ou selecione "Instalar aplicativo" no menu de opções.
- No **Safari** para iOS: toque no botão de compartilhamento e selecione "Adicionar à Tela de Início".

### Desktop (Windows, macOS e Linux)
- Clique no ícone de computador que aparece no lado direito da barra de endereços (URL) do navegador e selecione "Instalar".

## Requisitos do Sistema

- Um navegador moderno com suporte a Service Workers e JavaScript (como Google Chrome, Mozilla Firefox, Microsoft Edge ou Apple Safari).

## Funcionalidades Futuras
 - [ ] Adição de novas calculadoras (ROI, amortização de empréstimos, etc.).
 - [ ] Opção de visualização dos resultados em tabelas detalhadas
 - [ ] Exportação de relatórios em formatos adicionais (CSV, JSON).

## Créditos

Esse projeto foi inspirado em grande parte pelo conjunto de calculadoras disponíveis em [Calculator.net](https://www.calculator.net/investment-calculator.html). Quis trazer uma interface mais simples e com cálculos e funcionalidades adaptadas ao mercado brasileiro.

## Isenção de Responsabilidade

Este projeto foi desenvolvido com o auxílio de ferramentas generativas de Inteligência Artificial para a aceleração da escrita do código e da documentação. Embora testes tenham sido realizados, podem ocorrer erros ou inconsistências nas fórmulas ou dados de mercado. 

Caso encontre alguma discrepância nos cálculos ou vulnerabilidade no sistema, sinta-se à vontade para abrir uma *issue* no repositório do projeto para que eu possa corrigir e aprimorar a ferramenta.