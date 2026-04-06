import React from 'react';
import ControlePessoalModulePage from '@/components/dashboard/controle-pessoal/ControlePessoalModulePage';

const CnpjVenda = () => {
  return (
    <ControlePessoalModulePage
      moduleType="vendasimples"
      title="Controle Pessoal • CNPJ Venda"
      subtitle="Registre vendas por CNPJ e acompanhe seus registros comerciais"
      formTitle="Nova venda CNPJ"
    />
  );
};

export default CnpjVenda;
