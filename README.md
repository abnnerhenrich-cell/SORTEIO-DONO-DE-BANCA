# Sorteios da Kelly pronto para GitHub Pages

Rotas:
- `/dezenas/`
- `/centenas/`
- `/admin/`

Senha do admin:
`Marjorie06092025`

No painel:
- Criar sorteio
- Pausar/ativar
- Ver participantes
- Marcar ganhador
- Alterar nome do site, rodapé e URL do botão de cadastro

Para publicar:
1. Envie todos os arquivos para o repositório.
2. Vá em Settings > Pages.
3. Selecione Deploy from branch.
4. Branch `main`, pasta `/root`.
5. Salve.


## Firebase já configurado

Este pacote já está com o Firebase:

- projectId: `sorteio-dono-da-banca`
- authDomain: `sorteio-dono-da-banca.firebaseapp.com`

## Regras do Firestore

Também deixei o arquivo `firebase-rules.txt` com as regras para colar no Firestore.

No Firebase:
1. Vá em Firestore Database.
2. Clique em Regras.
3. Cole o conteúdo do arquivo `firebase-rules.txt`.
4. Publique.



## Atualização premium
- Visual premium melhorado.
- No Admin > Sorteios, agora dá para escolher se cada cliente marca 1 ou 2 dezenas/centenas.
- Compatível com sorteios antigos de 1 escolha.


## Firebase separado por página

Agora o site usa:

### Dezenas
- appId: `1:394364598624:web:97fc79bc06300cd8090605`
- measurementId: `G-SXFX6LQ969`

### Centenas
- appId: `1:394364598624:web:ecd75f94921260e8090605`
- measurementId: `G-45RSZGM8DL`

O código escolhe automaticamente o Firebase correto pela rota:
- `/dezenas/` usa o Firebase de dezena
- `/centenas/` usa o Firebase de centena
