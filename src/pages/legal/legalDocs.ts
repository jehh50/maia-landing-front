export type Lang = 'es' | 'en';

export interface LegalContent {
  title: string;
  subtitle: string;
  updated: string;
  body: string;
}

export interface LegalDoc {
  slug: string;
  es: LegalContent;
  en: LegalContent;
}

const privacy: LegalDoc = {
  slug: 'privacidad',
  es: {
    title: 'Política de Privacidad',
    subtitle: 'Maiabuilder · Un producto de Ximple Tech LLC',
    updated: 'Julio de 2026',
    body: `
La presente Política de Privacidad (en adelante, la "Política") describe cómo Ximple Tech trata los datos personales en el marco de la plataforma Maiabuilder. Le recomendamos leerla con atención. Al registrarse o utilizar la plataforma, usted declara haber leído y comprendido esta Política.

**Nota sobre idiomas:** Esta Política se publica en español e inglés. En caso de discrepancia o conflicto de interpretación entre ambas versiones, prevalecerá la versión en español.

## 1. Identificación del Responsable

El responsable del tratamiento de los datos personales asociados a la plataforma es:

- **Razón social:** Ximple Tech LLC
- **Domicilio:** Miami, Florida, USA
- **Correo de contacto en materia de privacidad:** privacy@maiabuilder.ai

Para cualquier consulta relacionada con esta Política o con el ejercicio de sus derechos, puede escribirnos al correo indicado.

## 2. Ámbito de Aplicación y Marco Legal

Maiabuilder es una plataforma web que permite construir, configurar y desplegar agentes conversacionales inteligentes que se integran con canales de mensajería como WhatsApp, Instagram, Slack y Microsoft Teams, y que opcionalmente se conectan a aplicaciones de terceros mediante protocolos de integración (MCP) para ejecutar tareas.

La plataforma está dirigida a emprendedores, profesionales, empresas y organizaciones que la utilizan en el marco de su actividad económica o profesional. La plataforma no está destinada a un uso personal o doméstico ajeno a una actividad profesional, ni a personas menores de edad.

Ximple Tech opera desde Chile y ofrece sus servicios principalmente en América Latina, comenzando por Chile, Perú, Venezuela y Colombia, sin descartar otros países de la región. Esta Política se rige por la legislación chilena aplicable en materia de protección de datos personales, incluida la Ley N° 19.628 y la Ley N° 21.719, sin perjuicio de las normas locales que resulten aplicables en función del país de residencia del usuario.

## 3. Roles: Responsable y Encargado del Tratamiento

Es fundamental distinguir dos escenarios de tratamiento de datos dentro de la plataforma:

### 3.1. Datos de nuestros clientes (Usuarios de la Plataforma)

Respecto de los datos de cuenta, facturación e identificación de las personas que contratan y utilizan Maiabuilder, Ximple Tech LLC actúa como responsable del tratamiento.

### 3.2. Datos que fluyen a través de los agentes (Usuarios Finales)

Respecto del contenido de las conversaciones que los usuarios finales mantienen con los agentes, así como de la información y el conocimiento que el cliente carga para entrenar a sus agentes, Ximple Tech actúa exclusivamente como encargado del tratamiento (procesador). Ximple actúa como canal de comunicación y proveedor tecnológico: no determina las finalidades de dicho tratamiento y no es responsable ni autor de la información intercambiada.

El cliente es el titular y responsable de la información que utilizan sus agentes. En consecuencia, corresponde al cliente contar con la base de legitimación adecuada (consentimiento u otra), informar a sus usuarios finales y atender el ejercicio de sus derechos. Ximple Tech tratará esos datos únicamente conforme a las instrucciones del cliente y a lo establecido en el contrato de servicio correspondiente.

## 4. Datos que Recopilamos

### 4.1. Usuarios de la Plataforma (clientes)

- Nombre y apellido.
- Correo electrónico.
- Datos de facturación y pago.
- Información y conocimiento de la empresa que el cliente carga para entrenar a sus agentes.
- Conversaciones sostenidas por sus agentes con usuarios finales.
- Conocimiento generado por los propios agentes a partir de dichas conversaciones.

### 4.2. Usuarios Finales (quienes interactúan con los agentes)

- Datos personales y/o de contacto, únicamente cuando el agente configurado por el cliente lo requiera.
- Contenido y registros (logs) de las conversaciones con el agente.

### 4.3. Datos técnicos y de navegación

Al utilizar la webapp recopilamos automáticamente datos técnicos mediante cookies y herramientas de analítica, según se detalla en la Sección 9.

## 5. Finalidades del Tratamiento

Tratamos los datos con las siguientes finalidades:

- Prestar, operar y mantener la plataforma y sus funcionalidades.
- Gestionar el registro, la autenticación, la facturación y el soporte de las cuentas.
- Permitir el funcionamiento de los agentes y su integración con los canales y aplicaciones de terceros.
- Dar seguimiento y resolver casos e incidencias del servicio.
- Reentrenar y mejorar los agentes del propio cliente. El reentrenamiento se realiza de forma aislada por cliente: las conversaciones de un cliente únicamente entrenan a sus propios agentes y permanecen dentro de su espacio de trabajo. En ningún caso el conocimiento o los datos de un cliente alimentan a los agentes de otro cliente.

## 6. Conservación de los Datos

Almacenamos el contenido de las conversaciones mientras el agente correspondiente se encuentre activo, y por un período de doce (12) meses. Estos datos no son compartidos con terceros ajenos al servicio y se utilizan únicamente para dar seguimiento y resolver casos, así como para el reentrenamiento del propio agente, manteniendo en todo momento la confidencialidad de las conversaciones.

Cuando el cliente elimina un agente, las conversaciones asociadas se conservan por un plazo máximo de treinta (30) días, tras lo cual son eliminadas o anonimizadas, salvo obligación legal que exija su conservación por un plazo mayor.

## 7. Encargados y Subprocesadores

Para prestar el servicio, Ximple Tech se apoya en proveedores tecnológicos que actúan como encargados o subencargados del tratamiento. Los principales son:

- **Infraestructura en la nube:** Amazon Web Services (AWS), región Norte de Virginia, Estados Unidos.
- **Canales de mensajería:** Twilio, Meta (WhatsApp Cloud API e Instagram).
- **Modelos de inteligencia artificial:** Anthropic, OpenAI y Google (Gemini), a elección del cliente.

Maiabuilder es agnóstica respecto del modelo de IA: el cliente selecciona el proveedor de modelo que utilizarán sus agentes. Estos proveedores tratan los datos únicamente para generar las respuestas del agente y conforme a sus propios términos.

## 8. Inteligencia Artificial y Reentrenamiento

Ximple Tech no desarrolla ni entrena modelos de inteligencia artificial propios. Utilizamos modelos de terceros seleccionados por el cliente.

Los datos de las conversaciones pueden emplearse para complementar la base de conocimiento vectorial que permite reentrenar y mejorar los agentes del propio cliente. Este proceso se realiza sin compartir los datos personales de los usuarios finales y de manera aislada por cliente, según lo indicado en las Secciones 5 y 6.

## 9. Cookies y Analítica

La webapp utiliza cookies y herramientas de analítica para su correcto funcionamiento, para recordar sus preferencias y para comprender el uso de la plataforma con fines de mejora. Usted puede configurar su navegador para gestionar o bloquear cookies; algunas funcionalidades podrían verse afectadas si las deshabilita.

## 10. Transferencias Internacionales de Datos

Dado que parte de nuestra infraestructura y de nuestros proveedores se encuentran fuera del país de residencia del usuario (por ejemplo, AWS en Estados Unidos y los proveedores de modelos de IA), el uso de la plataforma implica transferencias internacionales de datos personales. Ximple Tech adopta las salvaguardas contractuales y técnicas razonables para que dichas transferencias cuenten con un nivel adecuado de protección, conforme a la legislación aplicable.

## 11. Seguridad de la Información

Aplicamos medidas técnicas y organizativas razonables para proteger los datos personales frente a accesos no autorizados, pérdida o alteración. En particular:

- **Cifrado de credenciales:** las credenciales y tokens de acceso a las integraciones de terceros (por ejemplo, mediante MCP con Slack, Google Workspace, VTEX u otras) se almacenan cifrados.
- **Controles de acceso** y segregación de la información por cliente y espacio de trabajo.
- **Cifrado en tránsito** de las comunicaciones.

Ximple Tech se encuentra en proceso de fortalecer su gobierno de seguridad de la información con miras a certificaciones reconocidas del sector, tales como SOC 2 e ISO/IEC 27001. Ningún sistema es completamente infalible, por lo que no podemos garantizar una seguridad absoluta.

## 12. Derechos de los Titulares

Los titulares de datos personales pueden ejercer los derechos de acceso, rectificación, cancelación (supresión) y oposición, así como los demás derechos reconocidos por la legislación aplicable, escribiendo a privacy@maiabuilder.ai.

Tratándose de datos de usuarios finales tratados por Ximple como encargado, las solicitudes se canalizarán a través del cliente responsable, a quien Ximple prestará la colaboración razonable para atenderlas.

## 13. Menores de Edad

La plataforma se ofrece exclusivamente a personas mayores de edad. No recopilamos de forma consciente datos de menores de edad para el registro y uso de la plataforma.

## 14. Cambios en esta Política

Podremos actualizar esta Política para reflejar cambios legales, técnicos u operativos. Publicaremos la versión vigente en maiabuilder.ai/privacy, indicando la fecha de última actualización. El uso continuado de la plataforma tras la publicación de cambios implica la aceptación de la Política vigente.

## 15. Contacto

Para consultas, solicitudes o reclamos relacionados con esta Política de Privacidad, escríbanos a:

- **Correo:** privacy@maiabuilder.ai
- **Titular:** Ximple Tech LLC — Florida, Estados Unidos
`.trim(),
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'Maiabuilder · A product of Ximple Tech LLC',
    updated: 'July 2026',
    body: `
This Privacy Policy (hereinafter, the "Policy") describes how Ximple Tech processes personal data within the Maiabuilder platform. We encourage you to read it carefully. By registering or using the platform, you declare that you have read and understood this Policy.

**Note on languages:** This Policy is published in Spanish and English. In the event of any discrepancy or conflict of interpretation between the two versions, the Spanish version shall prevail.

## 1. Identification of the Data Controller

The party responsible for processing the personal data associated with the platform is:

- **Legal name:** Ximple Tech LLC
- **Address:** Miami, Florida, USA
- **Privacy contact email:** privacy@maiabuilder.ai

For any question related to this Policy or to the exercise of your rights, you may write to us at the email above.

## 2. Scope of Application and Legal Framework

Maiabuilder is a web platform that lets you build, configure and deploy intelligent conversational agents that integrate with messaging channels such as WhatsApp, Instagram, Slack and Microsoft Teams, and that optionally connect to third-party applications through integration protocols (MCP) to perform tasks.

The platform is intended for entrepreneurs, professionals, companies and organizations that use it in the course of their economic or professional activity. The platform is not intended for personal or domestic use unrelated to a professional activity, nor for minors.

Ximple Tech operates from Chile and offers its services primarily in Latin America, starting with Chile, Peru, Venezuela and Colombia, without ruling out other countries in the region. This Policy is governed by applicable Chilean data protection legislation, including Law No. 19,628 and Law No. 21,719, without prejudice to local rules that may apply based on the user's country of residence.

## 3. Roles: Data Controller and Data Processor

It is essential to distinguish two data processing scenarios within the platform:

### 3.1. Data of our customers (Platform Users)

With respect to the account, billing and identification data of the persons who contract and use Maiabuilder, Ximple Tech LLC acts as the data controller.

### 3.2. Data flowing through the agents (End Users)

With respect to the content of the conversations that end users hold with the agents, as well as the information and knowledge that the customer uploads to train their agents, Ximple Tech acts exclusively as a data processor. Ximple acts as a communication channel and technology provider: it does not determine the purposes of such processing and is neither responsible for nor the author of the information exchanged.

The customer is the owner of and responsible for the information used by their agents. Accordingly, it is the customer's responsibility to have the appropriate legal basis (consent or other), to inform their end users and to handle the exercise of their rights. Ximple Tech will process such data solely in accordance with the customer's instructions and the applicable service agreement.

## 4. Data We Collect

### 4.1. Platform Users (customers)

- First and last name.
- Email address.
- Billing and payment data.
- Company information and knowledge that the customer uploads to train their agents.
- Conversations held by their agents with end users.
- Knowledge generated by the agents themselves from those conversations.

### 4.2. End Users (those who interact with the agents)

- Personal and/or contact data, only when the agent configured by the customer requires it.
- Content and logs of the conversations with the agent.

### 4.3. Technical and browsing data

When using the web app, we automatically collect technical data through cookies and analytics tools, as detailed in Section 9.

## 5. Purposes of Processing

We process data for the following purposes:

- To provide, operate and maintain the platform and its features.
- To manage account registration, authentication, billing and support.
- To enable the operation of the agents and their integration with third-party channels and applications.
- To follow up on and resolve service cases and incidents.
- To retrain and improve the customer's own agents. Retraining is performed in isolation per customer: a customer's conversations only train their own agents and remain within their workspace. Under no circumstances does one customer's knowledge or data feed another customer's agents.

## 6. Data Retention

We store the content of conversations while the corresponding agent is active, and for a period of twelve (12) months. This data is not shared with third parties outside the service and is used solely to follow up on and resolve cases, as well as to retrain the agent itself, maintaining the confidentiality of the conversations at all times.

When the customer deletes an agent, the associated conversations are kept for a maximum of thirty (30) days, after which they are deleted or anonymized, unless a legal obligation requires their retention for a longer period.

## 7. Processors and Subprocessors

To provide the service, Ximple Tech relies on technology providers that act as processors or subprocessors. The main ones are:

- **Cloud infrastructure:** Amazon Web Services (AWS), North Virginia region, United States.
- **Messaging channels:** Twilio, Meta (WhatsApp Cloud API and Instagram).
- **Artificial intelligence models:** Anthropic, OpenAI and Google (Gemini), at the customer's choice.

Maiabuilder is model-agnostic: the customer selects the model provider that their agents will use. These providers process the data solely to generate the agent's responses and in accordance with their own terms.

## 8. Artificial Intelligence and Retraining

Ximple Tech does not develop or train its own artificial intelligence models. We use third-party models selected by the customer.

Conversation data may be used to complement the vector knowledge base that enables retraining and improving the customer's own agents. This process is carried out without sharing end users' personal data and in isolation per customer, as indicated in Sections 5 and 6.

## 9. Cookies and Analytics

The web app uses cookies and analytics tools for its proper operation, to remember your preferences and to understand the use of the platform for improvement purposes. You may configure your browser to manage or block cookies; some features may be affected if you disable them.

## 10. International Data Transfers

Since part of our infrastructure and providers are located outside the user's country of residence (for example, AWS in the United States and the AI model providers), the use of the platform involves international transfers of personal data. Ximple Tech adopts reasonable contractual and technical safeguards so that such transfers have an adequate level of protection, in accordance with applicable law.

## 11. Information Security

We apply reasonable technical and organizational measures to protect personal data against unauthorized access, loss or alteration. In particular:

- **Credential encryption:** the credentials and access tokens for third-party integrations (for example, via MCP with Slack, Google Workspace, VTEX or others) are stored encrypted.
- **Access controls** and segregation of information per customer and workspace.
- **Encryption in transit** of communications.

Ximple Tech is in the process of strengthening its information security governance with a view to recognized industry certifications, such as SOC 2 and ISO/IEC 27001. No system is completely infallible, so we cannot guarantee absolute security.

## 12. Rights of Data Subjects

Data subjects may exercise their rights of access, rectification, cancellation (erasure) and objection, as well as the other rights recognized by applicable law, by writing to privacy@maiabuilder.ai.

For end-user data processed by Ximple as a processor, requests will be channeled through the responsible customer, whom Ximple will reasonably assist in handling them.

## 13. Minors

The platform is offered exclusively to persons of legal age. We do not knowingly collect data from minors for registration and use of the platform.

## 14. Changes to this Policy

We may update this Policy to reflect legal, technical or operational changes. We will publish the current version at maiabuilder.ai/privacy, indicating the date of the last update. Continued use of the platform after changes are published implies acceptance of the current Policy.

## 15. Contact

For questions, requests or complaints related to this Privacy Policy, write to us at:

- **Email:** privacy@maiabuilder.ai
- **Owner:** Ximple Tech LLC — Florida, United States
`.trim(),
  },
};

const terms: LegalDoc = {
  slug: 'terminos',
  es: {
    title: 'Términos y Condiciones',
    subtitle: 'Maiabuilder · Un producto de Ximple Tech LLC',
    updated: 'Julio de 2026',
    body: `
Los presentes Términos y Condiciones (en adelante, los "Términos") regulan el acceso y uso de la plataforma Maiabuilder (en adelante, la "Plataforma"), un producto de Ximple Tech LLC (en adelante, "Ximple"). Al registrarse o utilizar la Plataforma, el cliente (en adelante, el "Cliente" o "usted") acepta quedar obligado por estos Términos. Si no está de acuerdo, no debe utilizar la Plataforma.

**Idiomas:** Estos Términos se publican en español e inglés. En caso de discrepancia entre ambas versiones, prevalecerá la versión en español.

## 1. Descripción del Servicio

Maiabuilder es una plataforma web que permite construir, configurar y desplegar agentes conversacionales inteligentes que se integran con canales de mensajería como WhatsApp, Instagram, Slack y Microsoft Teams, y que opcionalmente se conectan a aplicaciones de terceros mediante protocolos de integración (MCP) para ejecutar tareas.

La Plataforma es agnóstica respecto de los modelos de inteligencia artificial: el Cliente selecciona el proveedor de modelo (Anthropic, OpenAI o Google, entre otros) que utilizarán sus agentes.

## 2. Registro, Cuenta y Elegibilidad

La Plataforma está dirigida a emprendedores, profesionales, empresas y organizaciones que la utilizan en el marco de su actividad económica o profesional, y se ofrece exclusivamente a personas mayores de edad.

El Cliente es responsable de la veracidad de los datos de registro, de la confidencialidad de sus credenciales y de toda actividad realizada bajo su cuenta. El Cliente debe notificar a Ximple cualquier uso no autorizado de su cuenta.

## 3. Planes, Precios y Facturación

- **Suscripción:** El acceso a la Plataforma se contrata mediante suscripción, con periodicidad mensual o anual, según la opción que el Cliente elija al momento del pago.
- **Moneda:** Los precios se expresan y facturan en dólares de los Estados Unidos de América (USD).
- **Renovación automática:** Las suscripciones se renuevan automáticamente al final de cada período (mensual o anual) por un período equivalente, salvo que el Cliente cancele la renovación antes de la fecha de renovación.
- **Sin reembolsos:** Los pagos no son reembolsables, total ni parcialmente, salvo que la ley aplicable disponga lo contrario. La cancelación surte efecto al término del período ya pagado.

Ximple podrá modificar sus precios y planes, comunicando los cambios con antelación razonable. Los nuevos precios aplicarán a partir del siguiente período de renovación.

## 4. Propiedad Intelectual

### 4.1. La Plataforma

La Plataforma, incluyendo su software, código fuente, diseño, marcas, logotipos y demás elementos, es de propiedad exclusiva de Ximple o de sus licenciantes, y se encuentra protegida por la legislación de propiedad intelectual e industrial. Estos Términos no transfieren al Cliente ningún derecho de propiedad sobre la Plataforma, sino únicamente una licencia limitada, no exclusiva, intransferible y revocable para usarla conforme a estos Términos.

### 4.2. Contenido y conocimiento del Cliente

El contenido, la información y el conocimiento que el Cliente carga o proporciona para configurar y entrenar a sus agentes son y seguirán siendo de propiedad del Cliente. Ximple no reclama titularidad alguna sobre dicho contenido.

### 4.3. Conocimiento generado por los agentes

El conocimiento generado por los agentes a partir de las conversaciones (incluida la base de conocimiento vectorial asociada al Cliente) es de propiedad del Cliente. No obstante, el Cliente otorga a Ximple una licencia no exclusiva, mundial y libre de regalías para tratar dicho conocimiento con el único fin de operar, mantener y mejorar el servicio prestado al propio Cliente, de manera aislada por Cliente y conforme a la Política de Privacidad.

## 5. Obligaciones y Responsabilidades del Cliente

El Cliente es el único responsable del uso que haga de la Plataforma y de sus agentes. En particular, el Cliente se obliga a:

- **Consentimiento de usuarios finales:** obtener y mantener las bases de legitimación y consentimientos necesarios de sus usuarios finales, e informarles sobre el tratamiento de sus datos, actuando como responsable de dichos datos.
- **Contenido y comportamiento de los agentes:** responder por el contenido, las instrucciones, las respuestas y el comportamiento de los agentes que configura, así como por las decisiones que adopte basándose en ellos.
- **Políticas de terceros:** cumplir las políticas, términos y condiciones de los canales y servicios de terceros que utilice (incluyendo Meta/WhatsApp/Instagram, Slack, Microsoft Teams y los proveedores de modelos de IA).
- **Uso lícito:** abstenerse de utilizar la Plataforma para fines ilícitos, fraudulentos, engañosos, de spam, o que vulneren derechos de terceros o la legislación aplicable.

El Cliente mantendrá indemne a Ximple frente a cualquier reclamo, pérdida o daño derivado del incumplimiento de las obligaciones anteriores o del uso indebido de la Plataforma.

## 6. Servicios de Terceros

La Plataforma se integra con servicios de terceros (canales de mensajería, proveedores de modelos de IA e infraestructura, entre otros). Dichos servicios se rigen por sus propios términos y políticas, y Ximple no controla ni responde por su disponibilidad, funcionamiento o cambios. El uso de tales servicios es responsabilidad del Cliente.

## 7. Nivel de Servicio y Garantías

La Plataforma se presta "tal cual" ("as-is") y "según disponibilidad", sin garantía de disponibilidad ininterrumpida ni de estar libre de errores. Ximple no ofrece un acuerdo de nivel de servicio (SLA) de disponibilidad comprometido. En la medida permitida por la ley, Ximple no otorga garantías implícitas de comerciabilidad, idoneidad para un fin particular o no infracción.

## 8. Limitación de Responsabilidad

En la máxima medida permitida por la ley aplicable, la responsabilidad total y acumulada de Ximple frente al Cliente, por cualquier causa relacionada con la Plataforma o con estos Términos, se limitará al monto efectivamente pagado por el Cliente a Ximple en los doce (12) meses anteriores al hecho que dé origen a la reclamación.

Ximple no será responsable por daños indirectos, incidentales, especiales, punitivos o consecuenciales, ni por lucro cesante, pérdida de datos o pérdida de oportunidades de negocio, aun cuando se le hubiere advertido de su posibilidad.

## 9. Suspensión y Terminación

### 9.1. Suspensión por impago

El impago de la suscripción faculta a Ximple para bloquear el uso de los agentes y suspender el acceso a la Plataforma hasta la regularización del pago.

### 9.2. Suspensión por uso indebido

Ximple se reserva el derecho de suspender o restringir, total o parcialmente, el uso de los agentes o de la cuenta ante un uso indebido de la Plataforma o el incumplimiento de estos Términos, sin perjuicio de las demás acciones que correspondan.

### 9.3. Terminación por el Cliente y tratamiento de los datos

El Cliente puede cancelar su suscripción y solicitar la eliminación de su cuenta en cualquier momento. La cancelación surte efecto al término del período ya pagado, sin derecho a reembolso. Tras la eliminación de la cuenta, Ximple conservará los datos asociados por un plazo máximo de quince (15) días, dentro del cual el Cliente podrá solicitar la exportación de su información, transcurrido el cual los datos serán eliminados o anonimizados, salvo obligación legal de conservación.

## 10. Modificaciones a los Términos

Ximple podrá actualizar estos Términos para reflejar cambios legales, técnicos u operativos. La versión vigente se publicará en maiabuilder.ai/terms con su fecha de actualización. El uso continuado de la Plataforma tras la publicación de cambios implica la aceptación de los Términos vigentes.

## 11. Ley Aplicable y Jurisdicción

Estos Términos se rigen por las leyes de los Estados Unidos de Norteamérica. Cualquier controversia derivada de o relacionada con estos Términos o con el uso de la Plataforma se someterá a la competencia de los tribunales ordinarios de justicia con asiento en la ciudad de Miami, renunciando las partes a cualquier otro fuero que pudiera corresponderles.

## 12. Disposiciones Generales

- **Integridad:** Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo íntegro entre las partes respecto de la Plataforma.
- **Divisibilidad:** Si alguna cláusula fuese declarada inválida o inaplicable, las demás mantendrán su plena vigencia.
- **Cesión:** El Cliente no podrá ceder estos Términos sin el consentimiento previo y por escrito de Ximple. Ximple podrá cederlos en el marco de una reorganización societaria o transferencia de activos.
- **No renuncia:** La falta de ejercicio de un derecho por parte de Ximple no constituye renuncia al mismo.

## 13. Contacto

Para consultas relacionadas con estos Términos, escríbanos a:

- **Correo:** privacy@maiabuilder.ai
- **Titular:** Ximple Tech LLC — Miami, Florida, Estados Unidos
`.trim(),
  },
  en: {
    title: 'Terms and Conditions',
    subtitle: 'Maiabuilder · A product of Ximple Tech LLC',
    updated: 'July 2026',
    body: `
These Terms and Conditions (hereinafter, the "Terms") govern access to and use of the Maiabuilder platform (hereinafter, the "Platform"), a product of Ximple Tech LLC (hereinafter, "Ximple"). By registering or using the Platform, the customer (hereinafter, the "Customer" or "you") agrees to be bound by these Terms. If you do not agree, you must not use the Platform.

**Languages:** These Terms are published in Spanish and English. In the event of any discrepancy between the two versions, the Spanish version shall prevail.

## 1. Service Description

Maiabuilder is a web platform that lets you build, configure and deploy intelligent conversational agents that integrate with messaging channels such as WhatsApp, Instagram, Slack and Microsoft Teams, and that optionally connect to third-party applications through integration protocols (MCP) to perform tasks.

The Platform is agnostic with respect to artificial intelligence models: the Customer selects the model provider (Anthropic, OpenAI or Google, among others) that their agents will use.

## 2. Registration, Account and Eligibility

The Platform is intended for entrepreneurs, professionals, companies and organizations that use it in the course of their economic or professional activity, and is offered exclusively to persons of legal age.

The Customer is responsible for the accuracy of the registration data, for the confidentiality of their credentials and for all activity carried out under their account. The Customer must notify Ximple of any unauthorized use of their account.

## 3. Plans, Pricing and Billing

- **Subscription:** Access to the Platform is contracted through a subscription, on a monthly or annual basis, according to the option the Customer chooses at the time of payment.
- **Currency:** Prices are expressed and billed in United States dollars (USD).
- **Automatic renewal:** Subscriptions renew automatically at the end of each period (monthly or annual) for an equivalent period, unless the Customer cancels the renewal before the renewal date.
- **No refunds:** Payments are non-refundable, in whole or in part, unless applicable law provides otherwise. Cancellation takes effect at the end of the period already paid for.

Ximple may modify its prices and plans, communicating the changes with reasonable advance notice. New prices will apply as of the next renewal period.

## 4. Intellectual Property

### 4.1. The Platform

The Platform, including its software, source code, design, trademarks, logos and other elements, is the exclusive property of Ximple or its licensors, and is protected by intellectual and industrial property legislation. These Terms do not transfer to the Customer any ownership right over the Platform, but only a limited, non-exclusive, non-transferable and revocable license to use it in accordance with these Terms.

### 4.2. Customer content and knowledge

The content, information and knowledge that the Customer uploads or provides to configure and train their agents are and will remain the property of the Customer. Ximple claims no ownership over such content.

### 4.3. Knowledge generated by the agents

The knowledge generated by the agents from the conversations (including the vector knowledge base associated with the Customer) is the property of the Customer. However, the Customer grants Ximple a non-exclusive, worldwide, royalty-free license to process such knowledge for the sole purpose of operating, maintaining and improving the service provided to the Customer itself, in isolation per Customer and in accordance with the Privacy Policy.

## 5. Customer Obligations and Responsibilities

The Customer is solely responsible for their use of the Platform and their agents. In particular, the Customer undertakes to:

- **End-user consent:** obtain and maintain the necessary legal bases and consents from their end users, and inform them about the processing of their data, acting as the controller of such data.
- **Agent content and behavior:** be responsible for the content, instructions, responses and behavior of the agents they configure, as well as for the decisions they make based on them.
- **Third-party policies:** comply with the policies, terms and conditions of the third-party channels and services they use (including Meta/WhatsApp/Instagram, Slack, Microsoft Teams and the AI model providers).
- **Lawful use:** refrain from using the Platform for unlawful, fraudulent, deceptive or spam purposes, or in a manner that infringes the rights of third parties or applicable law.

The Customer shall hold Ximple harmless against any claim, loss or damage arising from breach of the foregoing obligations or from misuse of the Platform.

## 6. Third-Party Services

The Platform integrates with third-party services (messaging channels, AI model and infrastructure providers, among others). Such services are governed by their own terms and policies, and Ximple neither controls nor is responsible for their availability, operation or changes. The use of such services is the Customer's responsibility.

## 7. Service Level and Warranties

The Platform is provided "as-is" and "as available", without any warranty of uninterrupted availability or of being error-free. Ximple does not offer a committed availability service level agreement (SLA). To the extent permitted by law, Ximple grants no implied warranties of merchantability, fitness for a particular purpose or non-infringement.

## 8. Limitation of Liability

To the maximum extent permitted by applicable law, Ximple's total and aggregate liability to the Customer, for any cause related to the Platform or these Terms, shall be limited to the amount actually paid by the Customer to Ximple in the twelve (12) months prior to the event giving rise to the claim.

Ximple shall not be liable for indirect, incidental, special, punitive or consequential damages, nor for loss of profit, loss of data or loss of business opportunities, even if advised of their possibility.

## 9. Suspension and Termination

### 9.1. Suspension for non-payment

Non-payment of the subscription entitles Ximple to block the use of the agents and suspend access to the Platform until payment is settled.

### 9.2. Suspension for misuse

Ximple reserves the right to suspend or restrict, in whole or in part, the use of the agents or the account in the event of misuse of the Platform or breach of these Terms, without prejudice to any other applicable actions.

### 9.3. Termination by the Customer and treatment of data

The Customer may cancel their subscription and request deletion of their account at any time. Cancellation takes effect at the end of the period already paid for, without any right to a refund. After the account is deleted, Ximple will retain the associated data for a maximum of fifteen (15) days, within which the Customer may request the export of their information, after which the data will be deleted or anonymized, unless there is a legal obligation to retain it.

## 10. Amendments to the Terms

Ximple may update these Terms to reflect legal, technical or operational changes. The current version will be published at maiabuilder.ai/terms with its update date. Continued use of the Platform after changes are published implies acceptance of the current Terms.

## 11. Governing Law and Jurisdiction

These Terms are governed by the laws of the United States of America. Any dispute arising from or related to these Terms or the use of the Platform shall be submitted to the jurisdiction of the ordinary courts of justice seated in the city of Miami, with the parties waiving any other jurisdiction that may correspond to them.

## 12. General Provisions

- **Entire agreement:** These Terms, together with the Privacy Policy, constitute the entire agreement between the parties regarding the Platform.
- **Severability:** If any clause is declared invalid or unenforceable, the remaining clauses shall retain full force and effect.
- **Assignment:** The Customer may not assign these Terms without Ximple's prior written consent. Ximple may assign them in the context of a corporate reorganization or transfer of assets.
- **No waiver:** Ximple's failure to exercise a right does not constitute a waiver of it.

## 13. Contact

For questions related to these Terms, write to us at:

- **Email:** privacy@maiabuilder.ai
- **Owner:** Ximple Tech LLC — Miami, Florida, United States
`.trim(),
  },
};

export const legalDocs: Record<string, LegalDoc> = {
  privacidad: privacy,
  terminos: terms,
};
