export type TemplateListItem = {
  id: string;
  name: string;
  updated_at?: string;
};

export type TemplateRecord = TemplateListItem & {
  raw_config: string;
  created_at?: string;
};

export type AuthLoginResponse = {
  token: string;
  expiresAt: number;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
