export interface TemplateVariables {
  branch_name: string;
  branch_pattern: string;
  pr_number: string;
  pr_author: string;
  [key: string]: string;
}

export function renderTemplate(template: string, vars: TemplateVariables): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template,
  );
}
