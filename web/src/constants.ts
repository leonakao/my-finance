import type { ImportOption, TransactionType } from './types'

export const TYPE_OPTIONS: TransactionType[] = ['Despesa', 'Receita', 'Transferência']
export const UNGROUPED_FILTER_VALUE = '__ungrouped__'
export const CLASSIFICATION_RULE_MATCH_MODE_OPTIONS = [
  { value: 'description', label: 'Nome' },
  { value: 'description_amount', label: 'Nome + valor' },
]

export const CATEGORY_OPTIONS_BY_TYPE = {
  Despesa: [
    'Alimentação',
    'Moradia',
    'Transporte',
    'Saúde',
    'Seguros',
    'Educação',
    'Lazer',
    'Compras',
    'Assinaturas',
    'Telefone',
    'Trabalho',
    'Impostos e taxas',
    'Serviços financeiros',
    'Outros',
  ],
  Receita: [
    'Salário',
    'Freelance',
    'Reembolso',
    'Rendimentos',
    'Venda',
    'Benefícios',
    'Outros',
  ],
  Transferência: [
    'Investimentos',
    'Pagamento de fatura',
    'Transferência entre contas',
    'Reserva',
    'Outros',
  ],
}

export const DEFAULT_CATEGORY_BY_TYPE = {
  Despesa: 'Outros',
  Receita: 'Outros',
  Transferência: 'Outros',
}

export const IMPORT_OPTIONS: ImportOption[] = [
  { value: 'account', label: 'Nubank conta (CSV)' },
  { value: 'card', label: 'Nubank cartão (CSV)' },
  { value: 'santander-card-pdf', label: 'Santander fatura (PDF)' },
  { value: 'santander-account-pdf', label: 'Santander extrato (PDF)' },
]
