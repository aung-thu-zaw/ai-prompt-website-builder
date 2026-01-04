interface PricingProps {
  plans: string[];
}

const Pricing = ({ plans }: PricingProps) => {
  return (
    <>
      <section>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:py-32">
            <h2>Pricing</h2>
            <ul>
              {plans.map((plan: string) => (
                <li key={plan}>
                  <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
                    {plan}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
};

export default Pricing;
