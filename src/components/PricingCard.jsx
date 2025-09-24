import { Check, X } from 'lucide-react'

export default function PricingCard({ 
  plan, 
  isPopular = false, 
  onSelect, 
  currentPlan = null 
}) {
  const isCurrentPlan = currentPlan === plan.name.toLowerCase()

  return (
    <div className={`relative rounded-2xl shadow-lg ${
      isPopular 
        ? 'bg-blue-600 text-white ring-2 ring-blue-600' 
        : 'bg-white text-gray-900'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="p-8">
        <div className="text-center">
          <h3 className={`text-2xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
            {plan.name}
          </h3>
          <p className={`mt-2 ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
            {plan.description}
          </p>
          
          <div className="mt-6">
            <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
              ${plan.price}
            </span>
            <span className={`text-lg ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
              /month
            </span>
          </div>
        </div>

        <div className="mt-8">
          <ul className="space-y-4">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <Check className={`h-5 w-5 mt-0.5 mr-3 ${
                  isPopular ? 'text-blue-100' : 'text-green-500'
                }`} />
                <span className={`text-sm ${
                  isPopular ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          {isCurrentPlan ? (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed"
            >
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => onSelect(plan)}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isPopular
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {plan.price === 0 ? 'Get Started' : 'Upgrade Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
