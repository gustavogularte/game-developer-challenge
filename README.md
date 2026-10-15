# Pirate Battle

<p align="center">
  <img src="assets/png/default/ui/menu/title_pirate_battle.png" alt="Pirate Battle" width="360" />
</p>

**Batalha naval 2D no navegador, com combate em tempo real, navegação entre ilhas e controles para desktop e mobile.**

Desenvolvido a partir do [desafio técnico da Jungle Gaming](https://github.com/junglegaming/game-developer-challenge), o projeto combina React, TypeScript e PixiJS. O jogador comanda um navio pirata, enfrenta inimigos com comportamentos diferentes e tenta sobreviver até o fim da partida, somando pontos por cada inimigo derrotado.

O foco foi construir uma experiência jogável e organizada: movimentação com aceleração, tiros frontais e laterais, obstáculos navegáveis, feedback visual e sonoro e integração de ranking e histórico por uma API simulada.

[Repositório da solução](https://github.com/gustavogularte/game-developer-challenge) · [Decisões de arquitetura](ARCHITECTURE.md)

## Como executar

**Pré-requisitos:** Node.js 22.12 ou superior e pnpm disponível no terminal.

```bash
git clone https://github.com/gustavogularte/game-developer-challenge.git
cd game-developer-challenge
pnpm install
pnpm dev
```

Abra o endereço informado pelo Vite no terminal, normalmente `http://localhost:5173`.

**Não é necessário configurar variáveis de ambiente, credenciais ou um servidor separado.** O MSW intercepta as requisições da aplicação e simula a API no navegador, tanto em desenvolvimento quanto no build publicado. O service worker precisa de `localhost` ou HTTPS para funcionar.

Para gerar e visualizar a versão de produção:

```bash
pnpm build
pnpm preview
```

## Tecnologias e responsabilidades

| Tecnologia     | Uso no projeto                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| React 19       | Telas, menu, opções, HUD e diálogos de pausa e resultado.                       |
| TypeScript     | Contratos de dados, estados das entidades e regras de gameplay.                 |
| PixiJS 8       | Renderização do mundo, sprites, câmera e efeitos visuais.                       |
| Vite           | Servidor de desenvolvimento e build da aplicação.                               |
| CSS            | Interface responsiva, estados dos botões e composição com os assets fornecidos. |
| Axios          | Cliente HTTP centralizado para ranking, histórico e registro de partidas.       |
| TanStack Query | Cache, consultas, mutações e atualização das listas após o registro.            |
| MSW            | API simulada no navegador e cenários reproduzíveis de falha.                    |
| Web Audio API  | Reprodução de efeitos sonoros e loops de ambiente e navegação.                  |
| localStorage   | Opções, partidas confirmadas e fila de registros pendentes.                     |
| Playwright     | Testes de regras e fluxos de interface em desktop e mobile emulado.             |
| ESLint         | Verificações estáticas e regras de uso do React.                                |

## Como jogar

Desvie das ilhas, escolha o ângulo de ataque e use os canhões laterais para atingir inimigos fora da sua linha frontal. A partida termina quando a vida chega a zero ou quando o tempo acaba.

| Ação                   | Teclado                        |
| ---------------------- | ------------------------------ |
| Avançar                | `W` ou `↑`                     |
| Virar à esquerda       | `A` ou `←`                     |
| Virar à direita        | `D` ou `→`                     |
| Tiro frontal           | `Espaço`                       |
| Salva lateral esquerda | `Q`                            |
| Salva lateral direita  | `E`                            |
| Pausar                 | `Esc` ou botão de pausa do HUD |

**No mobile:** use os botões de movimento e ataque. Ao segurar o avanço e deslizar para uma seta lateral, o navio continua avançando enquanto vira. Também é possível movimentar e atirar com dedos diferentes. O jogo solicita orientação horizontal quando o navegador permite e usa uma adaptação visual em paisagem quando necessário.

Trocar de aba ou tirar o foco da janela pausa a partida. O retorno ao combate exige uma ação explícita em **RESUME**.

### Configuração da partida

| Opção                    | Valores disponíveis                        |
| ------------------------ | ------------------------------------------ |
| Duração                  | 60, 120 ou 180 segundos                    |
| Intervalo entre inimigos | De 1 a 10 segundos, em passos de 1 segundo |

O primeiro inimigo pode surgir após **1 segundo de jogo ativo**; os seguintes respeitam o intervalo escolhido. O spawn procura posições seguras, afastadas do jogador, de outros inimigos e das ilhas. Há um limite de oito inimigos vivos simultaneamente.

As opções são salvas localmente. Cada partida usa uma cópia das configurações do início: alterações feitas durante a pausa passam a valer na próxima partida. A pausa também congela o cronômetro, os projéteis e a duração dos bônus.

## Inimigos e recompensas

| Inimigo               | Comportamento                                                                    | Recompensa                                                                   |
| --------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Chaser                | Tem menos vida, persegue o jogador e se destrói ao encostar nele, causando dano. | 1 ponto quando derrotado pelo jogador; nenhum ponto ao explodir por contato. |
| Shooter padrão        | Mantém distância e dispara quando está alinhado e tem linha de tiro livre.       | 1 ponto.                                                                     |
| Shooter de cura       | Usa o comportamento do Shooter e deixa madeira coletável ao morrer.              | 1 ponto e recuperação de até 25 de vida ao coletar a madeira.                |
| Shooter de velocidade | Variante mais rara, identificada pelo navio amarelo.                             | 1 ponto e projéteis novos 50% mais rápidos por 5 segundos.                   |

Chasers e Shooters têm a mesma probabilidade de seleção. **Entre os Shooters**, a distribuição é 55% padrão, 30% cura e 15% velocidade. A escolha é aleatória; não existe uma sequência alternada obrigatória.

A cura respeita a vida máxima, e a madeira desaparece após 20 segundos ativos. O bônus de velocidade não altera dano, alcance ou intervalo entre disparos; receber outro bônus renova seus cinco segundos, sem acumular multiplicadores.

## Ideias exploradas no projeto

- **Sensação de navegação:** aceleração e desaceleração graduais, rastro de água e som suave enquanto o barco realmente se desloca.
- **Combate com posicionamento:** um canhão frontal e duas salvas laterais incentivam manobras e escolhas de aproximação.
- **Inimigos especiais sem pontuação inflada:** todos os abates do jogador valem um ponto. As variantes acrescentam decisões de cura e de aproveitamento de um bônus temporário.
- **Dano legível:** os sprites dos navios mudam conforme a vida, surgem efeitos de fogo e o casco treme levemente ao receber dano. A cura faz o jogador piscar verde; o bônus mantém um brilho amarelo enquanto ativo.
- **Consequências visuais do combate:** explosão, efeito de pontuação e três tripulantes na água após cada inimigo morrer. Eles se movimentam suavemente e encolhem antes de desaparecer em dois segundos ativos.
- **Ilhas com identidade:** praias irregulares, ruínas, grupos de vegetação e formações rochosas, preservando corredores de água para manobrar e combater.
- **Controles por toque combináveis:** manter o avanço ao deslizar para uma curva permite navegar e atacar sem exigir um dedo para cada ação.

## Decisões técnicas

**React para interface, PixiJS para o combate.** Posições e projéteis são atualizados na simulação, fora do estado do React. O HUD recebe mudanças relevantes de vida, pontuação e tempo, evitando reconstruir a interface a cada frame.

**Movimento por tempo decorrido.** Velocidades são aplicadas usando o delta em segundos, em vez de deslocamentos fixos por frame. Isso reduz a dependência da movimentação em relação à taxa de quadros.

**Colisões consistentes com o cenário.** O desenho e a colisão das ilhas usam o mesmo contorno arredondado. As verificações de trajetória dos projéteis consideram o segmento percorrido entre frames, reduzindo o risco de atravessar alvos rápidos. O impacto consome o projétil.

**Navegação ao redor de obstáculos.** Os inimigos usam rotas A* em uma grade compartilhada quando uma ilha bloqueia o caminho direto. Shooters verificam a linha de tiro antes de disparar.

**Efeitos separados das regras.** Eventos de combate acionam sons, explosões e recompensas na cena. A tremida visual não altera posições nem hitboxes. Objetos temporários são removidos ao encerrar seus efeitos.

**Registro tolerante a falhas.** Uma partida concluída é persistida antes do envio. O identificador da partida funciona como chave de idempotência: repetir uma requisição recupera o registro existente. Uma falha na API não impede iniciar outro combate.

Mais detalhes estão em [ARCHITECTURE.md](ARCHITECTURE.md).

### Organização do código

```text
src/
  App.tsx                 Navegação entre as telas
  GameScreen.tsx          Estado e ciclo de uma partida
  GameCanvas.tsx          Integração da simulação com o PixiJS
  GameHud.tsx             Interface durante o combate
  TouchControls.tsx       Entrada por toque
  game/                   Regras, navegação, colisões e fábricas visuais
  data/                   Contratos, cliente HTTP, mocks e sincronização
tests/                    Regras e fluxos automatizados
assets/                   Sprites, tiles e sons
public/                   Service worker do MSW
```

## Ranking e histórico

O histórico exibe apenas as partidas concluídas do jogador local, **Captain Jack**. O ranking combina seus registros com outros capitães fictícios fornecidos por fixtures. Ambos usam paginação de cinco resultados por página.

A comparação do ranking considera duração, intervalo de spawn e versão das regras. Empates de pontuação são resolvidos pela data de conclusão e pelo identificador da partida, mantendo uma ordem determinística.

Os dados ficam neste navegador. **Este é um ranking simulado, não um serviço online compartilhado entre jogadores.** Atualizar a página preserva registros e opções, mas abre o menu inicial. Partidas abandonadas não entram no histórico.

## Verificação e testes

```bash
pnpm typecheck
pnpm lint
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:report
```

Para executar apenas um grupo:

```bash
pnpm test:e2e --project=rules
pnpm test:e2e --project=desktop
pnpm test:e2e --project=mobile
```

A suíte cobre regras de combate e recompensas, navegação ao redor das ilhas, spawn, câmera, opções, pausa, controles simultâneos, paginação, recuperação de registros, idempotência e efeitos temporários. O Playwright inicia o servidor de teste automaticamente e gera um relatório HTML em `playwright-report/`; falhas retêm traces para investigação.

**Roteiro rápido para avaliar:** inicie uma partida de 60 segundos; experimente tiros frontais e laterais; atraia inimigos para perto de uma ilha; pause e retome; ao terminar, consulte o histórico e o ranking.

<details>
<summary><strong>Reproduzir falhas da API simulada</strong></summary>

Os cenários são selecionados pela URL, sem controles de diagnóstico na interface do jogador. Por exemplo:

```text
http://localhost:5173/?network=offline
http://localhost:5173/?network=timeoutAfterCommit
```

Os valores disponíveis são `success`, `empty`, `slow`, `variable`, `timeout`, `offline`, `http400`, `http500`, `rankingError`, `historyError`, `timeoutAfterCommit` e `registrationOffline`.

Para verificar recuperação sem duplicação, conclua uma partida em `timeoutAfterCommit`, remova o parâmetro e recarregue a página. O registro pendente é reenviado usando o mesmo identificador. Confira o histórico após a sincronização. O timeout do cliente HTTP é de quatro segundos.

Para voltar ao comportamento normal, remova `network` da URL e recarregue. Para restaurar os dados iniciais dos mocks, abra explicitamente `http://localhost:5173/?resetMocks=1`. Esse reset apaga partidas confirmadas, envios pendentes e o último resultado, preserva as opções e remove o próprio parâmetro da URL.

No preview ou em um deploy, utilize a origem correspondente no lugar de `localhost:5173`.

</details>

## Publicação e próximos passos

O build estático é gerado em `dist/` e pode ser hospedado em um serviço HTTPS com suporte a Vite. O arquivo `public/mockServiceWorker.js` deve acompanhar a publicação para que ranking e histórico funcionem. Nenhuma variável de ambiente é necessária.

Os próximos passos de validação são ampliar os testes de gameplay por entradas reais de combate, adicionar baselines de regressão visual e registrar medições de FPS, tempo entre frames e memória após ciclos de partidas. A emulação mobile não substitui a verificação em dispositivos físicos; orientação, tela cheia e áudio também dependem do navegador.

## Autoria e créditos

Solução desenvolvida por [gustavogularte](https://github.com/gustavogularte) para o desafio da [Jungle Gaming](https://github.com/junglegaming/game-developer-challenge).

Os assets visuais e sonoros usados no jogo foram fornecidos pelo repositório do desafio. A interface utiliza fontes monospace do sistema, sem download de fontes externas.
