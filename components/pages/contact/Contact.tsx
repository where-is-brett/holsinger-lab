import { SiteMeta } from "components/global/SiteMeta";
import ContactForm from "./ContactForm";
import Layout from "components/shared/Layout";

const Contact = ({ homePageTitle, settings }) => {

    return (
        <>
            <SiteMeta
                baseTitle={homePageTitle}
                description="Get in touch with us using the contact form below. We would love to hear from you!"
                image={settings?.ogImage}
                title="People"
            />

            <Layout settings={settings}
            >
                {/* <div className="mb-16"> */}
                <ContactForm />
                {/* </div> */}
            </Layout>
        </>
    )
}

export default Contact;