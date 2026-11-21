import { z } from 'zod';

export const filterInputSchema = z.object({
  kind: z.enum(['words', 'phrases', 'regex']),
  value: z.string().trim().min(1, 'Informe um filtro.').max(4096, 'Use até 4096 caracteres.'),
}).superRefine((value, context) => {
  if (value.kind !== 'regex') return;
  try { new RegExp(value.value); }
  catch { context.addIssue({ code: 'custom', path: ['value'], message: 'Expressão regular inválida.' }); }
});
