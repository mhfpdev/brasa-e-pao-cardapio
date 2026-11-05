# Brasa & Pão — cardápio digital

Site estático responsivo de uma hamburgueria **fictícia**. A página pública foi escrita como a de um estabelecimento de verdade, sem avisos de portfólio. Os preços, produtos e horários são dados de exemplo. Não há número real configurado para receber pedidos.

## Arquivos

- `index.html`, `styles.css`, `app.js`: site público e sacola de pedidos.
- `data/produtos.json`: catálogo e valores.
- `data/estabelecimento.json`: nome, mensagem, WhatsApp e entrega.
- `data/horarios.json`: horários por dia.
- `.pages.yml`: painel visual para editar os três arquivos no **Pages CMS**.
- `netlify.toml`: configuração opcional de publicação na Netlify.

## Testar localmente

A página carrega os JSON com `fetch()`, por isso **não** abra o `index.html` diretamente via `file://`. Rode um servidor local na pasta:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicar e editar pelo celular

1. Crie um **repositório novo e público** no GitHub e envie o conteúdo desta pasta (incluindo `.pages.yml` e `data/`).
2. Na **Netlify**, conecte o repositório GitHub em **Add new project → Import an existing project**. Como é um site estático, não há comando de build e o diretório publicado é a raiz (`.`).
3. No **[Pages CMS](https://app.pagescms.org/)**, entre com a conta GitHub, autorize o aplicativo para esse repositório e abra-o.
4. O painel mostrará **Produtos do cardápio**, **Horários de funcionamento** e **Informações da casa**. Edite e salve; o CMS criará um commit no repositório e a Netlify publicará automaticamente após o deploy.
5. Para fotos próprias, envie-as para a pasta `assets` e use o caminho `assets/nome-da-foto.jpg` no campo `imagem` do produto.

> Quem edita pelo Pages CMS precisa de autorização GitHub (ou convite como colaborador). Visitantes podem ver o site, mas não alterar o catálogo publicado.

## Horários

O arquivo `data/horarios.json` aceita **vários intervalos** separados por `;`:

```json
{
  "segunda": "",
  "terca": "00:00-00:30; 17:00-23:59",
  "sexta": "18:00-02:00"
}
```

- Vazio (`""`) = fechado.
- Sempre use `HH:MM-HH:MM` em formato 24 horas.
- `18:00-02:00` fecha às 02h **do dia seguinte**.
- O indicador “aberto agora” respeita o fuso configurado em `data/estabelecimento.json`.

## Pedidos

Sem WhatsApp configurado, o carrinho **copia o resumo do pedido** para a área de transferência. Para usar a abertura de conversa no WhatsApp, preencha `whatsapp` em `data/estabelecimento.json` com um número realmente pertencente ao estabelecimento, usando apenas dígitos. O cliente confirma o envio no WhatsApp.

Nenhum pagamento ou compra é processado no site. Os dados digitados no carrinho são usados apenas no navegador do cliente para compor a mensagem do pedido.

## Hospedagem

GitHub é utilizado aqui para armazenar o código e permitir a edição via Pages CMS. Para uso comercial que envolva facilitar pedidos, **prefira hospedagem apropriada**, como Netlify, em vez do GitHub Pages; os termos do GitHub Pages restringem sites principalmente destinados a facilitar transações comerciais.

## Créditos das imagens

Fotos ilustrativas servidas a partir de [Pexels](https://www.pexels.com/), sob a licença de uso da plataforma. Substitua pelas fotos reais do estabelecimento antes de usar comercialmente. As imagens são carregadas pela internet; se uma imagem não abrir, o cardápio mostra um emoji de reserva.