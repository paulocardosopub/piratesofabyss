# Pirates of the Abyss

Idle RPG naval em português, criado para navegador e celular. O jogo salva automaticamente no próprio dispositivo e pode ser instalado como aplicativo quando aberto por um servidor web.

**[Jogar agora no navegador](https://paulocardosopub.github.io/piratesofabyss/)**

## Como abrir

Você pode abrir `index.html` diretamente ou iniciar um servidor local nesta pasta:

```powershell
python -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Ranking online

O ranking global usa Supabase por configuração pública no arquivo `online-config.js`.

1. Crie um projeto no Supabase.
2. Abra o SQL Editor do Supabase e rode `database/supabase-pirate-leaderboard.sql` e `database/supabase-pirate-guilds.sql`.
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
