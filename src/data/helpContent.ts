import {
  Rocket,
  LayoutDashboard,
  Receipt,
  Tag,
  RefreshCw,
  CreditCard,
  BarChart2,
  WifiOff,
  Smartphone,
  Shield,
  Lightbulb,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

export type HelpItem = {
  title: string
  content: string[]
}

export type HelpSection = {
  id: string
  title: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  description: string
  route?: string
  routeLabel?: string
  items: HelpItem[]
}

export const helpSections: HelpSection[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    icon: Rocket,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    description: 'Como começar a usar o app do zero.',
    items: [
      {
        title: 'Criar conta ou fazer login',
        content: [
          'Acesse o app e toque em "Entrar com Google" ou use e-mail e senha.',
          'Se for seu primeiro acesso, clique em "Criar conta" e preencha os dados.',
          'Após entrar, você verá o Dashboard com seu painel financeiro.',
        ],
      },
      {
        title: 'Cadastrar categorias primeiro',
        content: [
          'Antes de criar lançamentos, vá até a aba Categorias.',
          'Crie pelo menos uma categoria de Despesa e uma de Receita.',
          'As categorias organizam seus lançamentos e aparecem nos relatórios.',
          'Exemplo: "Alimentação" (Despesa), "Salário" (Receita).',
        ],
      },
      {
        title: 'Criar seu primeiro lançamento',
        content: [
          'Vá até a aba Lançamentos e toque em "Lançar".',
          'Escolha Despesa ou Receita.',
          'Selecione a categoria, informe a descrição, o valor e as datas.',
          'Escolha o tipo: Normal (avulso), Fixo (recorrente) ou Parcelado.',
          'Toque em Salvar.',
        ],
      },
      {
        title: 'Diferença entre Despesa e Receita',
        content: [
          'Despesa é qualquer saída de dinheiro: conta, compra, pagamento.',
          'Receita é qualquer entrada de dinheiro: salário, transferência recebida, venda.',
          'O app soma receitas e subtrai despesas para calcular o saldo.',
        ],
      },
      {
        title: 'Escolher o mês no seletor',
        content: [
          'No topo do Dashboard e de Lançamentos há um seletor de mês.',
          'Toque nas setas para navegar entre meses.',
          'Cada tela mostra dados apenas do mês selecionado.',
        ],
      },
      {
        title: 'Instalar o app no celular',
        content: [
          'Ao abrir no navegador, aparece um banner para instalar.',
          'Toque em "Instalar" para adicionar à tela inicial do celular.',
          'Depois de instalado, o app abre sem barra do navegador, como um app nativo.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Visão geral do seu mês financeiro.',
    route: '/',
    routeLabel: 'Ir para Dashboard',
    items: [
      {
        title: 'Cards de resumo (despesas, receitas, saldo)',
        content: [
          'O Dashboard exibe cards coloridos com o total de despesas, receitas e o saldo do mês.',
          'Saldo atual = receitas pagas − despesas pagas.',
          'Saldo previsto = todas receitas − todas despesas (incluindo pendentes).',
          'Toque em um card para ver os lançamentos relacionados.',
        ],
      },
      {
        title: 'Contas atrasadas, vencem hoje e próximos 7 dias',
        content: [
          'O Dashboard também mostra alertas de contas com vencimento próximo.',
          '"Atrasadas" são pendentes com data de cobrança anterior a hoje.',
          '"Vencem hoje" são pendentes com data de cobrança igual a hoje.',
          '"Próximos 7 dias" são pendentes nos próximos 7 dias.',
          'Toque em qualquer alerta para ver os lançamentos.',
        ],
      },
      {
        title: 'Gráfico de despesas por categoria',
        content: [
          'Um gráfico de pizza mostra como suas despesas estão distribuídas por categoria.',
          'Cada fatia representa o percentual de uma categoria no total de despesas do mês.',
          'Útil para identificar onde você está gastando mais.',
        ],
      },
      {
        title: 'Personalizar cards visíveis',
        content: [
          'Você pode escolher quais cards de resumo aparecem no Dashboard.',
          'Toque no botão de configuração (engrenagem) para selecionar os cards visíveis.',
          'As preferências são salvas no seu perfil.',
        ],
      },
    ],
  },
  {
    id: 'lancamentos',
    title: 'Lançamentos',
    icon: Receipt,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'Registre, edite e gerencie suas movimentações financeiras.',
    route: '/transactions',
    routeLabel: 'Ir para Lançamentos',
    items: [
      {
        title: 'Tipo de lançamento: Normal, Fixo e Parcelado',
        content: [
          'Normal: lançamento avulso, ocorre uma única vez.',
          'Fixo: lançamento recorrente (aluguel, assinatura, salário mensal). Gerado automaticamente todo mês ou semana.',
          'Parcelado: compra dividida em N parcelas. O app gera todas as parcelas automaticamente.',
        ],
      },
      {
        title: 'Despesa ou Receita',
        content: [
          'Escolha o tipo antes de selecionar a categoria.',
          'As categorias são filtradas pelo tipo escolhido.',
          'Categorias do tipo "Ambos" aparecem tanto para Despesa quanto para Receita.',
        ],
      },
      {
        title: 'Data de lançamento e data de cobrança',
        content: [
          'Data de lançamento: quando você registrou a movimentação.',
          'Data de cobrança/vencimento: quando o valor será cobrado ou recebido.',
          'Use a data de cobrança para controlar vencimentos e receber alertas no Dashboard.',
        ],
      },
      {
        title: 'Status: Pendente e Pago',
        content: [
          'Pendente: o lançamento ainda não foi pago ou recebido.',
          'Pago: o valor já saiu ou entrou na sua conta.',
          'Apenas lançamentos pagos entram no saldo atual. Pendentes entram no saldo previsto.',
          'Toque no ícone de status para alternar entre Pendente e Pago.',
        ],
      },
      {
        title: 'Editar um lançamento',
        content: [
          'Toque no lançamento para abrir o menu de opções.',
          'Escolha "Editar" e altere os campos desejados.',
          'Salve as alterações.',
        ],
      },
      {
        title: 'Excluir lançamento normal',
        content: [
          'Toque no lançamento e escolha "Excluir".',
          'Uma confirmação será exibida antes de excluir definitivamente.',
        ],
      },
      {
        title: 'Excluir lançamento fixo ou parcelado',
        content: [
          'Ao excluir um lançamento fixo ou parcelado, o app pergunta se deseja excluir apenas este ou todos os futuros pendentes.',
          '"Apenas este": remove somente o lançamento selecionado.',
          '"Este e os próximos pendentes": remove o atual e todos os futuros ainda pendentes.',
          'Lançamentos já pagos nunca são excluídos em lote.',
        ],
      },
      {
        title: 'Filtros disponíveis',
        content: [
          'Filtro por status: Todos, Pendentes ou Pagos.',
          'Filtro por tipo: Todos, Despesas ou Receitas.',
          'Filtro por categoria: selecione uma ou mais categorias.',
          'Os filtros podem ser combinados para refinar a visualização.',
        ],
      },
      {
        title: 'Ordenação',
        content: [
          'Ordene a lista por: Vencimento, Data de lançamento, Nome, Categoria ou Valor.',
          'Toque no seletor de ordenação para trocar a ordem.',
        ],
      },
    ],
  },
  {
    id: 'categorias',
    title: 'Categorias',
    icon: Tag,
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    description: 'Organize seus lançamentos com categorias personalizadas.',
    route: '/categories',
    routeLabel: 'Ir para Categorias',
    items: [
      {
        title: 'Criar uma categoria',
        content: [
          'Acesse a aba Categorias e toque em "Nova categoria".',
          'Informe o nome da categoria.',
          'Escolha o tipo: Despesa, Receita ou Ambos.',
          'Escolha uma cor para identificar visualmente a categoria.',
          'Salve.',
        ],
      },
      {
        title: 'Tipo "Ambos"',
        content: [
          'Use o tipo "Ambos" quando uma categoria puder representar tanto saída quanto entrada.',
          'Exemplo: "Transferências" pode ser uma despesa (enviar) ou receita (receber).',
          'Categorias do tipo "Ambos" aparecem na lista de Despesas e de Receitas ao criar um lançamento.',
        ],
      },
      {
        title: 'Escolher cor da categoria',
        content: [
          'Cada categoria tem uma cor para facilitar identificação visual.',
          'O app oferece uma paleta de 40 cores.',
          'Cores já usadas por outras categorias aparecem bloqueadas para evitar confusão.',
          'Escolha uma cor diferente para cada categoria.',
        ],
      },
      {
        title: 'Editar e excluir categorias',
        content: [
          'Toque na categoria para editar nome, tipo ou cor.',
          'Para excluir, a categoria não pode estar sendo usada por nenhum lançamento.',
          'Se a categoria está em uso, o app impede a exclusão e mostra uma mensagem de aviso.',
          'Primeiro exclua ou reclassifique os lançamentos da categoria antes de removê-la.',
        ],
      },
      {
        title: 'Impacto das categorias nos relatórios',
        content: [
          'O relatório detalhado mostra o tipo e categoria de cada lançamento.',
          'O relatório resumido agrupa por categoria mostrando totais.',
          'O gráfico do Dashboard usa as cores das categorias.',
        ],
      },
    ],
  },
  {
    id: 'contas-fixas',
    title: 'Contas Fixas',
    icon: RefreshCw,
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    description: 'Gerencie despesas e receitas recorrentes automaticamente.',
    route: '/fixed',
    routeLabel: 'Ir para Contas Fixas',
    items: [
      {
        title: 'O que é uma conta fixa',
        content: [
          'Conta fixa é qualquer valor que se repete regularmente: aluguel, internet, plano de celular, assinatura, salário mensal.',
          'Você cadastra a conta fixa uma vez e o app gera os lançamentos automaticamente para cada período.',
        ],
      },
      {
        title: 'Conta fixa mensal',
        content: [
          'Selecione a frequência "Mensal" ao criar a conta fixa.',
          'Informe o dia do mês em que a cobrança ocorre (ex: dia 10).',
          'Informe o mês de início.',
          'O app gera um lançamento para esse dia em cada mês gerado.',
        ],
      },
      {
        title: 'Conta fixa semanal',
        content: [
          'Selecione a frequência "Semanal".',
          'Escolha o dia da semana (ex: toda segunda-feira).',
          'O app gera um lançamento para cada ocorrência semanal no mês.',
        ],
      },
      {
        title: 'Gerar contas fixas do mês ou do ano',
        content: [
          'Na aba Contas Fixas, use os botões "Gerar este mês" ou "Gerar este ano".',
          'O app cria os lançamentos correspondentes em Lançamentos.',
          'Se os lançamentos já existirem para o período, o app evita duplicidade.',
          'Recomendado: gere o mês no início de cada mês.',
        ],
      },
      {
        title: 'Ativar e desativar conta fixa',
        content: [
          'Contas fixas podem ser ativadas ou desativadas sem precisar excluir.',
          'Uma conta desativada não gera novos lançamentos.',
          'Útil para contas temporariamente suspensas (ex: férias, contrato encerrado).',
        ],
      },
      {
        title: 'Excluir lançamentos fixos futuros pendentes',
        content: [
          'Na lista de Lançamentos, toque em um lançamento fixo e escolha excluir.',
          'O app pergunta se deseja excluir apenas este ou este e os próximos pendentes.',
          'Lançamentos fixos já pagos nunca são excluídos em lote.',
        ],
      },
    ],
  },
  {
    id: 'parceladas',
    title: 'Parceladas',
    icon: CreditCard,
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    iconColor: 'text-pink-600 dark:text-pink-400',
    description: 'Controle compras parceladas e acompanhe o progresso.',
    route: '/installments',
    routeLabel: 'Ir para Parceladas',
    items: [
      {
        title: 'O que é um parcelamento',
        content: [
          'Parcelamento é uma compra dividida em N parcelas mensais.',
          'Exemplo: TV comprada em 12x de R$ 100.',
          'Você cadastra uma vez e o app gera todas as parcelas automaticamente.',
        ],
      },
      {
        title: 'Criar um parcelamento',
        content: [
          'Vá até a aba Lançamentos, toque em "Lançar" e escolha o tipo "Parcelado".',
          'Informe o valor total ou o valor de cada parcela.',
          'Informe o número de parcelas.',
          'Informe a data de vencimento da primeira parcela.',
          'O app calculará e gerará todas as parcelas mensalmente.',
        ],
      },
      {
        title: 'Acompanhar o parcelamento',
        content: [
          'Na aba Parceladas, você vê o resumo de cada grupo de parcelamento.',
          'O status pode ser: Em andamento, Quitado ou Atrasado.',
          'Veja quantas parcelas já foram pagas e quantas faltam.',
          'O total pago e o total restante são calculados automaticamente.',
        ],
      },
      {
        title: 'Marcar parcela como paga',
        content: [
          'Na aba Lançamentos, localize a parcela pelo filtro de categoria ou mês.',
          'Toque no ícone de status para marcar como Pago.',
          'O resumo do grupo é atualizado automaticamente.',
        ],
      },
      {
        title: 'Excluir parcelas',
        content: [
          'Ao excluir uma parcela, o app pergunta se deseja excluir apenas esta ou esta e as próximas pendentes.',
          '"Apenas esta": remove somente a parcela selecionada.',
          '"Esta e as próximas pendentes": remove a atual e todas as futuras ainda pendentes.',
          'Parcelas já pagas não são excluídas em lote.',
          'O resumo do grupo de parcelamento é recalculado após cada exclusão.',
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: BarChart2,
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description: 'Analise seus dados financeiros por período.',
    route: '/reports',
    routeLabel: 'Ir para Relatórios',
    items: [
      {
        title: 'Selecionar período',
        content: [
          'Na aba Relatórios, escolha a data de início e a data de fim.',
          'Toque em "Buscar" para carregar os dados do período selecionado.',
          'Você pode consultar qualquer intervalo de datas.',
        ],
      },
      {
        title: 'Modo detalhado',
        content: [
          'O modo detalhado lista todos os lançamentos individualmente.',
          'Mostra descrição, categoria, tipo, status, data e valor.',
          'Útil para conferência completa do período.',
        ],
      },
      {
        title: 'Modo resumido',
        content: [
          'O modo resumido agrupa os lançamentos por categoria.',
          'Mostra o total de cada categoria no período.',
          'Útil para uma visão rápida de onde o dinheiro foi.',
        ],
      },
      {
        title: 'Exportar Excel',
        content: [
          'Toque em "Exportar Excel" para baixar os dados em formato .xlsx.',
          'O arquivo pode ser aberto no Excel, Google Planilhas ou LibreOffice.',
          'O nome do arquivo inclui o período consultado.',
          'Ideal para análises detalhadas fora do app.',
        ],
      },
      {
        title: 'Exportar PDF',
        content: [
          'Toque em "Exportar PDF" para gerar um relatório em formato .pdf.',
          'O PDF é formatado para impressão ou compartilhamento.',
          'Inclui cabeçalho com o período e tabela com os dados.',
          'Ideal para guardar uma cópia ou enviar para terceiros.',
        ],
      },
      {
        title: 'Quando usar Excel ou PDF',
        content: [
          'Use Excel quando precisar fazer cálculos, filtros ou gráficos personalizados.',
          'Use PDF quando quiser uma versão formatada para imprimir ou compartilhar.',
          'Ambos os formatos exportam exatamente o que está sendo exibido na tela.',
        ],
      },
    ],
  },
  {
    id: 'offline',
    title: 'Funcionamento Offline',
    icon: WifiOff,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Use o app mesmo sem internet e sincronize depois.',
    items: [
      {
        title: 'Usar sem internet',
        content: [
          'Se você já abriu o app antes com internet, ele continua funcionando offline.',
          'O app é instalado no seu dispositivo como um PWA e guarda os dados localmente.',
          'Basta abrir normalmente, mesmo sem sinal.',
        ],
      },
      {
        title: 'Criar e editar lançamentos offline',
        content: [
          'Você pode criar, editar e excluir lançamentos mesmo sem internet.',
          'As alterações são salvas no aparelho e ficam marcadas como "pendentes de sincronização".',
          'O app exibe um banner laranja informando que você está offline.',
        ],
      },
      {
        title: 'Sincronização automática',
        content: [
          'Assim que a internet voltar, o app sincroniza automaticamente com a nuvem.',
          'Você não precisa fazer nada: a sincronização acontece em segundo plano.',
          'O banner muda para azul durante a sincronização e desaparece quando tudo estiver sincronizado.',
        ],
      },
      {
        title: 'O que significa cada status de sincronização',
        content: [
          '"Pendente": a alteração está salva no aparelho mas ainda não foi enviada para a nuvem.',
          '"Sincronizando": o app está enviando as alterações para a nuvem agora.',
          '"Erro": houve um problema ao sincronizar. O app tentará novamente na próxima conexão.',
        ],
      },
      {
        title: 'Limitação do modo offline',
        content: [
          'O modo offline funciona principalmente para lançamentos (criar, editar, excluir).',
          'Categorias, Contas Fixas e Parceladas podem depender de internet ou do cache do navegador.',
          'Relatórios também dependem de dados já carregados anteriormente.',
          'Para melhor experiência offline, use o app conectado regularmente.',
        ],
      },
    ],
  },
  {
    id: 'instalacao',
    title: 'Instalação do App (PWA)',
    icon: Smartphone,
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    description: 'Instale o app na tela inicial e use como app nativo.',
    items: [
      {
        title: 'Instalar no Android',
        content: [
          'Abra o app no Chrome.',
          'Aguarde o banner "Instalar aplicativo" aparecer na parte de baixo da tela.',
          'Toque em "Instalar" e confirme.',
          'O ícone aparecerá na sua tela inicial.',
          'Alternativamente: toque nos três pontos do Chrome → "Adicionar à tela inicial".',
        ],
      },
      {
        title: 'Instalar no iPhone / iOS',
        content: [
          'Abra o app no Safari.',
          'Toque no botão de compartilhar (quadrado com seta para cima).',
          'Role a lista e toque em "Adicionar à Tela de Início".',
          'Confirme o nome e toque em "Adicionar".',
          'O ícone aparecerá na sua tela inicial.',
        ],
      },
      {
        title: 'Instalar no desktop',
        content: [
          'Abra o app no Chrome ou Edge.',
          'Na barra de endereço, aparecerá um ícone de instalação (computador com seta).',
          'Clique no ícone e confirme a instalação.',
          'O app abrirá em uma janela separada, sem a barra do navegador.',
        ],
      },
      {
        title: 'Atualização automática',
        content: [
          'O app se atualiza automaticamente quando há uma nova versão disponível.',
          'Você verá uma notificação na tela pedindo para recarregar.',
          'Aceite para aplicar a atualização.',
        ],
      },
      {
        title: 'Verificar atualização e limpar cache',
        content: [
          '"Verificar atualização": busca se há uma nova versão disponível.',
          '"Limpar cache": apaga os arquivos salvos no navegador e recarrega tudo do zero.',
          'Use "Limpar cache" somente se o app estiver se comportando de forma estranha.',
          'Após limpar o cache, você precisará de internet para recarregar o app.',
          'No menu lateral (desktop), essas opções estão no rodapé da barra lateral.',
        ],
      },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança e Dados',
    icon: Shield,
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    description: 'Seus dados são protegidos e separados por usuário.',
    items: [
      {
        title: 'Login com Firebase',
        content: [
          'O app usa o Firebase Authentication para gerenciar o acesso.',
          'Você pode entrar com Google ou com e-mail e senha.',
          'A senha é gerenciada pelo Google/Firebase e nunca é armazenada diretamente no app.',
        ],
      },
      {
        title: 'Separação de dados por usuário',
        content: [
          'Cada usuário acessa somente seus próprios dados.',
          'Não é possível ver dados de outros usuários.',
          'Os dados são armazenados no Firestore com regras de segurança por usuário.',
        ],
      },
      {
        title: 'Boas práticas de segurança',
        content: [
          'Use uma senha forte e única para sua conta.',
          'Não compartilhe seu login com outras pessoas.',
          'Se usar em dispositivo compartilhado, faça logout ao terminar.',
          'Mantenha o e-mail de recuperação atualizado.',
        ],
      },
      {
        title: 'Exportação não é backup completo',
        content: [
          'Os arquivos Excel e PDF exportados contêm apenas os dados do período consultado.',
          'Não são um backup completo de todos os seus dados.',
          'Para guardar todos os dados, exporte por períodos maiores.',
          'Um sistema de backup completo é uma melhoria planejada para o futuro.',
        ],
      },
    ],
  },
  {
    id: 'dicas',
    title: 'Dicas Importantes',
    icon: Lightbulb,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600 dark:text-yellow-500',
    description: 'Boas práticas para aproveitar melhor o app.',
    items: [
      {
        title: 'Cadastre categorias antes dos lançamentos',
        content: [
          'Sem categorias você não consegue criar lançamentos.',
          'Planeje suas categorias antes de começar a lançar.',
          'Mantenha os nomes curtos e descritivos.',
        ],
      },
      {
        title: 'Marque como pago somente quando pagar de verdade',
        content: [
          'O saldo atual reflete apenas lançamentos marcados como Pago.',
          'Marcar antes do prazo distorce o saldo real da sua conta.',
          'Use o status Pendente para tudo que ainda não saiu ou entrou na conta.',
        ],
      },
      {
        title: 'Use a data de cobrança para controlar vencimentos',
        content: [
          'A data de cobrança é a que aparece nos alertas do Dashboard.',
          'Preencha corretamente para receber alertas de contas próximas do vencimento.',
        ],
      },
      {
        title: 'Gere as contas fixas no início do mês',
        content: [
          'Acesse a aba Contas Fixas no começo de cada mês.',
          'Toque em "Gerar este mês" para criar todos os lançamentos recorrentes do mês.',
          'Isso garante que o Dashboard e os relatórios do mês já estejam completos.',
        ],
      },
      {
        title: 'Use relatórios para conferência mensal',
        content: [
          'No final do mês, use os Relatórios para conferir todos os lançamentos.',
          'Compare com extratos bancários para garantir que nada ficou de fora.',
          'Exporte em Excel para análises mais detalhadas.',
        ],
      },
      {
        title: 'Aguarde sincronizar antes de trocar de aparelho',
        content: [
          'Se você lançou algo offline, aguarde o banner de sincronização desaparecer.',
          'Só então troque de dispositivo para garantir que os dados estejam na nuvem.',
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: 'Perguntas Frequentes',
    icon: HelpCircle,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    description: 'Respostas rápidas para as dúvidas mais comuns.',
    items: [
      {
        title: 'Posso usar sem internet?',
        content: [
          'Sim! Se você já abriu o app com internet antes, ele funciona offline.',
          'Lançamentos criados, editados ou excluídos sem internet ficam salvos no aparelho.',
          'Assim que a internet voltar, tudo é sincronizado automaticamente.',
        ],
      },
      {
        title: 'O que acontece se eu lançar offline?',
        content: [
          'O lançamento é salvo localmente no seu aparelho.',
          'Fica marcado como "pendente de sincronização".',
          'Quando a internet voltar, o app envia automaticamente para a nuvem.',
        ],
      },
      {
        title: 'Como sei que sincronizou?',
        content: [
          'O banner de sincronização desaparece quando tudo estiver salvo na nuvem.',
          'Durante a sincronização, o banner fica azul com um ícone girando.',
          'Sem banner = tudo sincronizado.',
        ],
      },
      {
        title: 'Posso cadastrar receita e despesa na mesma categoria?',
        content: [
          'Sim! Crie a categoria com o tipo "Ambos".',
          'Ela aparecerá disponível tanto ao criar uma Despesa quanto uma Receita.',
        ],
      },
      {
        title: 'O que é saldo atual?',
        content: [
          'Saldo atual = soma de todas as receitas pagas − soma de todas as despesas pagas no mês.',
          'Reflete apenas o que de fato entrou e saiu da sua conta.',
        ],
      },
      {
        title: 'O que é saldo previsto?',
        content: [
          'Saldo previsto considera todos os lançamentos: pagos e pendentes.',
          'Mostra como seu saldo ficará se todas as contas forem pagas/recebidas.',
        ],
      },
      {
        title: 'O que acontece ao excluir uma parcela?',
        content: [
          'Você pode excluir apenas a parcela selecionada ou essa e as próximas pendentes.',
          'Parcelas já pagas não são excluídas em lote.',
          'O resumo do grupo de parcelamento é recalculado automaticamente.',
        ],
      },
      {
        title: 'Por que não posso excluir uma categoria em uso?',
        content: [
          'Para proteger a integridade dos seus lançamentos.',
          'Se uma categoria fosse excluída, os lançamentos que a usam ficariam sem categoria, corrompendo relatórios e gráficos.',
          'Solução: edite ou exclua os lançamentos da categoria primeiro, depois exclua a categoria.',
        ],
      },
      {
        title: 'Para que serve limpar cache?',
        content: [
          'Limpa todos os arquivos do app salvos no navegador.',
          'Útil quando o app estiver se comportando de forma estranha após uma atualização.',
          'Após limpar, você precisará de internet para recarregar o app.',
          'Use somente quando necessário.',
        ],
      },
      {
        title: 'O Excel/PDF é um backup completo?',
        content: [
          'Não. Os arquivos exportados contêm apenas os dados do período consultado.',
          'Para guardar tudo, exporte por períodos maiores ou faça múltiplas exportações.',
          'Um sistema de backup completo está planejado para versões futuras do app.',
        ],
      },
      {
        title: 'Posso usar em mais de um celular?',
        content: [
          'Sim! Faça login com a mesma conta em qualquer dispositivo.',
          'Os dados ficam na nuvem e são sincronizados em todos os aparelhos.',
          'Aguarde a sincronização completar antes de trocar de aparelho para evitar conflitos.',
        ],
      },
      {
        title: 'O app atualiza sozinho?',
        content: [
          'Sim. Quando uma nova versão estiver disponível, uma notificação aparecerá na tela.',
          'Aceite para aplicar a atualização imediatamente.',
          'Você também pode forçar a verificação usando o botão "Verificar atualização" na barra lateral.',
        ],
      },
    ],
  },
]

export const quickAccessIds = [
  'primeiros-passos',
  'lancamentos',
  'contas-fixas',
  'parceladas',
  'relatorios',
  'offline',
  'instalacao',
  'seguranca',
]
