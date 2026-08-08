"use client";

import CardsAlertProjectForm from "./projects/CardsAlertProjectForm";
import RPAProjectForm from "./projects/RPAProjectForm";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type CardsAlertFields = {
  cardYear: string;
  setCardYear: (value: string) => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  cardNumber: string;
  setCardNumber: (value: string) => void;
  brand: string;
  setBrand: (value: string) => void;
  parallel: string;
  setParallel: (value: string) => void;
  sport: string;
  setSport: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  previousGrade: string;
  setPreviousGrade: (value: string) => void;
  previousCertNumber: string;
  setPreviousCertNumber: (value: string) => void;
  previousSourceUrl: string;
  setPreviousSourceUrl: (value: string) => void;
};

type Props = {
  project: "rpa-tracker" | "cards-alert" | "tiffany-cards" | "guides";
  activeObject: ActiveObject;
  cardsAlertFields?: CardsAlertFields;
  sports?: string[];
  reasons?: string[];
  cardTitle: string;
  setCardTitle: (value: string) => void;
  serialNumber: string;
  setSerialNumber: (value: string) => void;
  variation: string;
  setVariation: (value: string) => void;
  grade: string;
  setGrade: (value: string) => void;
  certNumber: string;
  setCertNumber: (value: string) => void;
};

export default function ProjectFields({
  project,
  activeObject,
  cardsAlertFields,
  sports = [],
    reasons = [],
  cardTitle,
  setCardTitle,
  serialNumber,
  setSerialNumber,
  variation,
  setVariation,
  grade,
  setGrade,
  certNumber,
  setCertNumber,
}: Props) {
  if (project === "rpa-tracker") {
    return (
      <RPAProjectForm
        activeObject={activeObject}
        cardTitle={cardTitle}
        setCardTitle={setCardTitle}
        serialNumber={serialNumber}
        setSerialNumber={setSerialNumber}
        variation={variation}
        setVariation={setVariation}
        grade={grade}
        setGrade={setGrade}
        certNumber={certNumber}
        setCertNumber={setCertNumber}
      />
    );
  }

  if (project === "cards-alert" && cardsAlertFields) {
    return (
      <CardsAlertProjectForm
  reasons={reasons}
  sports={sports}

  status={cardsAlertFields.status}
  setStatus={cardsAlertFields.setStatus}

  cardYear={cardsAlertFields.cardYear}
  setCardYear={cardsAlertFields.setCardYear}

  sport={cardsAlertFields.sport}
  setSport={cardsAlertFields.setSport}

  firstName={cardsAlertFields.firstName}
  setFirstName={cardsAlertFields.setFirstName}

  lastName={cardsAlertFields.lastName}
  setLastName={cardsAlertFields.setLastName}

  cardNumber={cardsAlertFields.cardNumber}
  setCardNumber={cardsAlertFields.setCardNumber}

  parallel={cardsAlertFields.parallel}
  setParallel={cardsAlertFields.setParallel}

  serialNumber={serialNumber}
  setSerialNumber={setSerialNumber}

  brand={cardsAlertFields.brand}
  setBrand={cardsAlertFields.setBrand}

  grade={grade}
  setGrade={setGrade}

  certNumber={certNumber}
  setCertNumber={setCertNumber}
/>
    );
  }

  return null;
}