import React from 'react';
import ModalFicha from './Modais/ModalFicha';
import ModalTransferencia from './Modais/ModalTransferencia';
import ModalStatus from './Modais/ModalStatus';
import ModalExcluir from './Modais/ModalExcluir';
import ModalQR from './Modais/ModalQR';
import ModalQRLote from './Modais/ModalQRLote';

export default function ModaisOperacao(props) {
  return (
    <>
      <ModalFicha {...props} />
      <ModalTransferencia {...props} />
      <ModalStatus {...props} />
      <ModalExcluir {...props} />
      <ModalQR {...props} />
      <ModalQRLote {...props} />
    </>
  );
}