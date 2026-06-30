# Pirates of the Abyss

Idle RPG naval em português, criado para navegador e celular. O jogo salva automaticamente no próprio dispositivo e pode ser instalado como aplicativo quando aberto por um servidor web.

**[Jogar agora no navegador](https://paulocardosopub.github.io/piratesofabyss/)**

## Como abrir

Você pode abrir `index.html` diretamente ou iniciar um servidor local nesta pasta:

```powershell
python -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Versao desktop Windows

O jogo tambem pode ser empacotado como aplicativo desktop com Electron. A versao web continua funcionando normalmente; o desktop usa os mesmos arquivos do jogo e a mesma configuracao online de `online-config.js`.

### Requisitos

- Node.js 20 ou mais recente.
- Windows para gerar instalador Windows localmente.

### Desenvolvimento desktop

```powershell
npm install
npm run dev:desktop
```

Esse comando cria um build web limpo em `dist-web`, gera o icone do app em `build/` e abre o jogo em uma janela propria.

### Gerar executavel e instalador

```powershell
npm run package:windows
```

Os arquivos finais ficam em `release/`:

- Instalador Windows NSIS com atalho na area de trabalho, menu iniciar e desinstalador.
- Versao portatil `.exe`, sem instalacao.

### Scripts disponiveis

- `npm run dev:desktop`: abre o app desktop em modo local.
- `npm run build:web`: copia somente os arquivos necessarios do jogo para `dist-web` e otimiza assets do build.
- `npm run build:desktop`: gera uma pasta desktop desempacotada para validacao.
- `npm run package:windows`: gera instalador e executavel portatil.
- `npm run optimize:assets`: otimiza os assets fonte do jogo.
- `npm run dist`: atalho para `package:windows`.

### Otimizacao de assets

O build desktop recomprime PNGs sem perda visual e compacta GIFs animados dos mapas para ficarem menores. Os GIFs sao reduzidos para ate 1280px de largura, mantem a proporcao 4:3, preservam a duracao total da animacao e usam menos quadros:

- Mapas de 18 quadros viram 9 quadros.
- O mapa animado de 72 quadros vira 24 quadros.

Isso reduz bastante o tamanho do instalador sem mudar os caminhos usados pelo jogo.

### Configuracao online

O desktop usa a URL e a chave publica do Supabase definidas em `online-config.js`. Nao use `localhost` nem chave `service_role` nesse arquivo de producao. Login, save, ranking, Arena, Irmandade e demais sistemas online continuam usando as mesmas chamadas HTTPS da versao web.

### Observacoes de empacotamento

Arquivos temporarios, builds e caches locais ficam fora do pacote por `.gitignore` e pelo build limpo em `dist-web`. A pasta `tmp-visual-check/` nao e empacotada.

## Ranking online

O ranking global usa Supabase por configuração pública no arquivo `online-config.js`.

1. Crie um projeto no Supabase.
2. Abra o SQL Editor do Supabase e rode `database/supabase-pirate-leaderboard.sql`, `database/supabase-pirate-guilds.sql` e `database/supabase-pirate-accounts.sql`.
3. Em `online-config.js`, preencha:

```js
window.PIRATES_ONLINE_CONFIG = {
  provider: "supabase",
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_CHAVE_PUBLICA_DO_SUPABASE",
  tableName: "pirate_leaderboard",
  readRelationName: "pirate_leaderboard_public",
  arenaRelationName: "pirate_arena_public",
  limit: 50
};
```

Use apenas a chave publica do Supabase (`anon public`, `publishable key` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Nunca coloque a chave `service_role` no frontend.

Se o arquivo estiver vazio ou o Supabase estiver offline, o jogo continua funcionando e a tela de Stats mostra que o ranking online está indisponível. Ao realizar Prestígio, o jogo envia o ranking e salva também `pvp_snapshot` para uma futura Arena PvP assíncrona.

## Controles

- **Iniciar / Pausar:** controla o combate automático.
- **Desafiar boss:** libera após 100 vitórias na região.
- **Resetar navio:** restaura a vida e reinicia o combate sem apagar progresso.
- **Ícones de skill:** toque para ligar ou desligar o lançamento automático.
- **Comércio:** compre ou venda materiais usando Ouro, com confirmação de cada transação.
- **Prólogo:** atravesse cinco mapas da Era Primitiva com embarcações Tier 0 antes de iniciar a jornada pirata original.
- **Frota:** compre navios em seis tiers usando nível, Prestígios, Ouro, Madeira e materiais especiais; a frota da jornada é reiniciada ao realizar Prestígio.
- **Prestígio:** após derrotar o Megalodon Ancestral em Oceano Profundo, reinicie a jornada para ganhar Moedas Pirata, bônus permanentes e pets que nunca são perdidos.
- **Encontros:** enfrente pescadores, comerciantes, contrabandistas, piratas, marinha, fantasmas e criaturas com atributos e recompensas diferentes.
- **Animais clicáveis:** toque em pássaros, peixes, tubarões e no Kraken para receber 10, 20, 30 ou 100 de Comida.
- **Progresso offline:** rende 10% do combate ativo, com limite máximo de 24 horas.
- **Menu inferior:** acesse estaleiro, mapas, recursos e estatísticas sem interromper o combate.
