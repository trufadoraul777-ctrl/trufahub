# TrufaHub — primeira versão

Painel web em português para guardar, editar e compartilhar arquivos `.lua` de forma privada.

## O que já funciona
- Criar conta e entrar com e-mail/senha pelo Supabase Auth.
- Upload múltiplo de arquivos `.lua` (limite da interface: 10 MB por arquivo).
- Listar, pesquisar e ordenar scripts.
- Editar e salvar o conteúdo de arquivos no armazenamento remoto.
- Baixar e excluir arquivos.
- Gerar links assinados temporários de leitura (1 hora, 24 horas ou 7 dias).
- Metadados e arquivos protegidos por políticas RLS; o bucket é privado.

## Importante: ainda precisa configurar a nuvem
Não há credenciais do seu projeto Supabase incluídas. Por segurança, não é correto inventar chaves nem fingir que o site já está publicado. Depois de configurar o Supabase e publicar os arquivos estáticos, ele funcionará pela internet.

## Passo 1 — criar o backend gratuito
1. Crie um projeto em https://supabase.com/.
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase-setup.sql`.
3. Em **Project Settings → API**, copie a Project URL e a chave publicável (anon/public).
4. Abra `config.js` e substitua:
   - `COLE_A_URL_DO_SEU_PROJETO`
   - `COLE_SUA_CHAVE_PUBLICAVEL`
5. Nunca use a chave `service_role` no navegador, no GitHub ou neste arquivo.

## Passo 2 — testar localmente
Como é um site estático, rode um servidor local na pasta:
- Python: `python -m http.server 8000`
- Abra `http://localhost:8000`

Não abra `index.html` diretamente como `file://`; use o servidor local.

## Passo 3 — publicar grátis
Uma opção é **Cloudflare Pages**:
1. Envie os arquivos deste projeto para um repositório Git.
2. Em Cloudflare Pages, crie um projeto conectado ao repositório.
3. Como é HTML/CSS/JS puro, use a raiz do projeto como diretório de saída; não é necessário comando de build.
4. Publique e use o domínio `pages.dev` fornecido ou conecte um domínio próprio.
5. No Supabase Auth, ajuste **URL Configuration / Site URL** para a URL publicada e inclua a URL local em Redirect URLs durante os testes.

## Privacidade e limites
- O bucket `lua-scripts` é privado.
- Um link assinado permite leitura a qualquer pessoa que o tenha até expirar. Não o compartilhe publicamente se o script for sensível.
- Links assinados são temporários; a lista da interface é mantida apenas na sessão atual do navegador.
- As políticas de segurança estão em `supabase-setup.sql`. Se você já tiver políticas com os mesmos nomes, remova-as antes de executar novamente o SQL.
- Os limites de armazenamento, transferência e usuários dependem do plano vigente do Supabase. Confira o painel antes de hospedar muitos arquivos.
- O projeto hospeda e entrega arquivos Lua; ele não executa scripts dentro do Roblox nem garante que um script funcione no jogo.
- Evite armazenar tokens, senhas, cookies ou outras credenciais dentro dos scripts.

## Arquivos
- `index.html` — estrutura do painel e telas de autenticação.
- `style.css` — interface responsiva dark mode.
- `app.js` — autenticação, upload, listagem, editor, links temporários.
- `config.js` — URL e chave pública do Supabase.
- `supabase-setup.sql` — tabela, bucket privado e políticas de acesso.
