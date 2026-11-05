# Brasa & Pão — cardápio

Cardápio de um estabelecimento fictício para apresentação. Publicado no GitHub Pages em https://mhfpdev.github.io/brasa-e-pao-cardapio/.

## Edição pelo celular

Entre em https://app.pagescms.org/ com a conta autorizada para este repositório, abra `mhfpdev/brasa-e-pao-cardapio` e selecione a branch `main`.

- **Produtos — adicionar, editar ou remover:** adicione itens à lista, edite nome, ingredientes, categoria, preço, promoção e foto; remova itens ou desative “Mostrar no cardápio”. A ordem da lista define a ordem no site. A categoria é livre e cria o filtro automaticamente. O identificador é gerado a partir do nome, sem campo de código interno.
- **Tamanhos ou sabores:** cada opção tem nome, preço completo e disponibilidade. O cliente escolhe uma opção antes de adicionar.
- **Adicionais:** nome, valor adicional e disponibilidade. Selecionados na sacola, seus valores entram no total e na mensagem.
- **Estabelecimento e pedidos:** nome, logotipo, apresentação, textos, foto principal, WhatsApp, contatos, redes sociais, endereço, mapa, pausa de pedidos, aviso temporário, entrega e retirada, prazo, pedido mínimo, taxas por bairro, entrega grátis, pagamentos e fuso horário.
- **Horários e feriados:** marque os dias fechados e cadastre um ou mais períodos por dia. `18:00` a `02:00` fecha no dia seguinte. Datas especiais substituem a programação semanal; uma data marcada como fechada também encerra a extensão da madrugada anterior.
- **Fotos enviadas pelo cliente:** envie JPG, PNG, WebP ou GIF pelo celular. Os arquivos ficam em `assets/uploads/`, recebem nomes aleatórios e o seletor preenche o caminho no produto. Os arquivos originais fora dessa pasta não aparecem na biblioteca.

Salve no CMS. O GitHub valida os dados, confere as fotos em uso e publica a atualização. A execução aparece na aba **Actions**. Se houver erro de validação, a última versão válida permanece publicada.

## Proteção das fotos

A configuração do Pages CMS não oferece uma trava condicional de exclusão baseada nas referências do site. A proteção deste projeto ocorre no fluxo de publicação:

1. Antes de publicar, identifica as fotos referenciadas nos produtos, logotipo e foto principal.
2. Se uma foto em uso foi removida, bloqueia a nova publicação e mantém a versão pública anterior no ar. Para liberar a publicação, restaure o arquivo pelo histórico Git ou troque a foto no cadastro. O Pages CMS hospedado ainda permite excluir o arquivo no painel: esta proteção atua antes do deploy.
3. Fotos do cliente sem referência podem ser excluídas normalmente. A falta dos dois arquivos originais necessários ao layout também bloqueia o deploy.
4. Uploads com assinatura de arquivo incompatível, formato não permitido ou tamanho acima de 8 MB bloqueiam a publicação. O CMS filtra extensões; a checagem de conteúdo e tamanho ocorre no GitHub.
5. Arquivos JSON do cardápio não podem ser apagados nem renomeados pela interface configurada. Itens dentro da lista de produtos podem ser removidos.

A pasta separa arquivos entregues e uploads futuros; não representa propriedade individual por pessoa. Administradores com acesso direto ao GitHub continuam tendo as permissões do repositório. O histórico permite recuperar alterações. As verificações de imagem não substituem um antivírus.

## Pedidos

O botão **Continuar no WhatsApp** abre a conversa de `+55 14 98100-5730`, configurado pelo proprietário para a apresentação, com a mensagem pronta. O cliente toca em enviar no WhatsApp; não há cópia de resumo nem envio automático.

A mensagem contém produtos, opções, adicionais, quantidades, subtotal, entrega, total, modalidade, nome, endereço quando há entrega, pagamento, troco e observações. Os valores são calculados em centavos. Produtos removidos ou indisponíveis são descartados da sacola ao recarregar; renomear um produto também remove sua versão antiga da sacola.

O CMS gerencia conteúdo e regras do cardápio. Não é um sistema de caixa: não processa pagamentos, reserva estoque, armazena clientes, recebe pedidos num banco de dados ou oferece acompanhamento de pedidos. A confirmação do atendimento e do pagamento acontece pelo WhatsApp.

## Desenvolvimento

Sem dependências de build:

```sh
python3 -m http.server 8000
node scripts/validate-site.mjs
node --test tests/*.test.mjs
```

A publicação usa `.github/workflows/pages.yml`. O GitHub Pages deve usar **GitHub Actions** como origem. Somente arquivos públicos são enviados ao artifact; configurações e testes ficam no repositório.

As fotos ilustrativas são servidas pelo Pexels; o rodapé informa “Imagens meramente ilustrativas”. O site mantém uma imagem local de reserva para a capa e um símbolo de reserva nos produtos.

A publicação usa somente leitura do código. A recuperação automática com commit não foi ativada: a revisão automática de permissões rejeitou a concessão permanente de escrita ao workflow.
