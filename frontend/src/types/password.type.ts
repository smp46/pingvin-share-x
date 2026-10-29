export type PasswordGeneratorConfig = {
  length: number;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
};

export type PasswordGeneratorValidationRules = {
  length: {
    min: number;
    max: number;
  };
};
