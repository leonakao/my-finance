export const TYPE_OPTIONS = ['Despesa', 'Receita', 'Transferência']
export const UNGROUPED_FILTER_VALUE = '__ungrouped__'
export const CLASSIFICATION_RULE_MATCH_MODE_OPTIONS = [
  { value: 'description', label: 'Nome' },
  { value: 'description_amount', label: 'Nome + valor' },
]

export const CATEGORY_OPTIONS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Assinaturas',
  'Investimentos',
  'Salário',
  'Telefone',
  'Outros',
]

export const IMPORT_OPTIONS = [
  { value: 'account', label: 'Nubank conta (CSV)' },
  { value: 'card', label: 'Nubank cartão (CSV)' },
  { value: 'santander-card-pdf', label: 'Santander fatura (PDF)' },
  { value: 'santander-account-pdf', label: 'Santander extrato (PDF)' },
]
