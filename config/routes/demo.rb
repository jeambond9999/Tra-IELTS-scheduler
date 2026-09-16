# frozen_string_literal: true

get "inertia-example", to: "inertia_example#index"
get "demo", to: "inertia_example#demo"
post "demo", to: "inertia_example#create"
post "demo/fetch", to: "inertia_example#client_fetch"
